/**
 * National bulk import via PostgreSQL COPY (pg-copy-streams).
 * Requires EXPLORE_DATABASE_URL. Never activates the catalogue.
 */
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import pg from "pg";
import { from as copyFrom } from "pg-copy-streams";
import { NATIONAL_EXPECTED_POINT_COUNT, NATIONAL_REGION_ID, STOKE_REGION_ID } from "./constants.js";
import type { NationalImportTarget } from "./resolve-target.js";
import { iterateNationalPoints, pointToCopyCsvLine } from "./stream-ndjson.js";

export type ImportProgress = {
  rowsCopied: number;
  elapsedMs: number;
  rowsPerSec: number;
};

export type ImportResult = {
  ok: boolean;
  dryRun: false;
  importJobId: string;
  catalogueVersionId: number;
  stagedCount: number;
  finalCount: number;
  durationMs: number;
  status: string;
  regionId: string;
  nationalActive: false;
  stokeActive: boolean;
  error?: string;
};

function requireDatabaseUrl(): string {
  const url =
    process.env.EXPLORE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      "Set EXPLORE_DATABASE_URL (Postgres connection string with SSL). Do not use the service-role key for COPY."
    );
  }
  return url;
}

export function redactDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "[redacted]";
  }
}

async function assertSsl(client: pg.Client): Promise<boolean | null> {
  try {
    const r = await client.query("SHOW ssl");
    return String(r.rows[0]?.ssl ?? "").toLowerCase() === "on";
  } catch {
    return null;
  }
}

export async function runNationalCatalogueImport(opts: {
  ndjsonPath: string;
  target: NationalImportTarget;
  /** Filled after dry-run scan when target.ndjsonSha256 was not pinned. */
  ndjsonSha256?: string;
  restartFailed?: boolean;
  onProgress?: (p: ImportProgress) => void;
}): Promise<ImportResult> {
  const target = opts.target;
  const ndjsonSha256 = opts.ndjsonSha256 ?? target.ndjsonSha256 ?? "";
  const databaseUrl = requireDatabaseUrl();
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  });

  const t0 = Date.now();
  await client.connect();

  try {
    const ssl = await assertSsl(client);
    if (ssl === false && !databaseUrl.includes("127.0.0.1")) {
      throw new Error("Refusing non-SSL database connection for hosted import");
    }

    const tables = await client.query(
      `SELECT to_regclass('public.explore_catalogue_import_jobs') AS jobs,
              to_regclass('public.explore_points_import_staging') AS staging`
    );
    if (!tables.rows[0]?.jobs || !tables.rows[0]?.staging) {
      throw new Error(
        "Missing import tables — apply migration 20260726120000_explore_national_bulk_import.sql (supabase db push)"
      );
    }

    const stoke = await client.query(
      `SELECT id FROM explore_point_catalogue_versions
       WHERE region_id = $1 AND status = 'active' LIMIT 1`,
      [STOKE_REGION_ID]
    );
    const stokeActive = (stoke.rowCount ?? 0) > 0;

    const conflict = await client.query(
      `SELECT id, status FROM explore_point_catalogue_versions
       WHERE region_id = $1 AND status IN ('ready', 'active')
       LIMIT 5`,
      [target.regionId]
    );
    if ((conflict.rowCount ?? 0) > 0) {
      const ids = conflict.rows.map((r) => `${r.id}:${r.status}`).join(",");
      throw new Error(`Conflicting catalogue already ready/active for ${target.regionId}: ${ids}`);
    }

    const ver = await client.query(
      `INSERT INTO explore_point_catalogue_versions (
         region_id, generation_version, source_revision, status, point_count, coverage_km2, metadata
       ) VALUES ($1, $2, $3, 'building', $4, NULL, $5::jsonb)
       ON CONFLICT (region_id, generation_version, source_revision)
       DO UPDATE SET
         status = 'building',
         point_count = EXCLUDED.point_count,
         metadata = explore_point_catalogue_versions.metadata || EXCLUDED.metadata,
         activated_at = NULL,
         retired_at = NULL
       RETURNING id`,
      [
        target.regionId,
        target.generationVersion,
        target.sourceRevision,
        target.expectedPointCount,
        JSON.stringify({
          catalogue_build_id: target.catalogueBuildId,
          generator_config_hash: target.generatorConfigHash,
          ndjson_sha256: ndjsonSha256 || null,
          validation_status: "ok",
          min_spacing_m: 150,
          points_by_type: target.pointsByType,
          active: false,
          import_strategy: "copy_staging",
        }),
      ]
    );
    const catalogueVersionId = Number(ver.rows[0]!.id);

    await client.query(`DELETE FROM explore_points WHERE catalogue_version_id = $1`, [
      catalogueVersionId,
    ]);

    if (opts.restartFailed) {
      await client.query(
        `UPDATE explore_catalogue_import_jobs
         SET status = 'cleaned', updated_at = now()
         WHERE region_id = $1 AND status = 'failed'`,
        [target.regionId]
      );
    }

    const job = await client.query(
      `INSERT INTO explore_catalogue_import_jobs (
         region_id, catalogue_build_id, catalogue_version_id, status,
         expected_point_count, source_revision, generator_config_hash, ndjson_sha256,
         points_by_type, started_at, metadata
       ) VALUES ($1,$2,$3,'staging',$4,$5,$6,$7,$8::jsonb, now(), $9::jsonb)
       RETURNING id`,
      [
        target.regionId,
        target.catalogueBuildId,
        catalogueVersionId,
        target.expectedPointCount,
        target.sourceRevision,
        target.generatorConfigHash,
        ndjsonSha256 || "pending",
        JSON.stringify(target.pointsByType),
        JSON.stringify({ ndjson_path_basename: "catalogue.ndjson" }),
      ]
    );
    const importJobId = String(job.rows[0]!.id);

    const copySql = `
      COPY public.explore_points_import_staging (
        import_job_id, id, latitude, longitude, point_type, generation_version,
        source_revision, source_type, source_feature_id, confidence, environment_profile
      ) FROM STDIN WITH (FORMAT csv, NULL '')
    `;

    let rowsCopied = 0;
    const progressEvery = 25_000;
    const pointStream = Readable.from(
      (async function* () {
        for await (const p of iterateNationalPoints(opts.ndjsonPath)) {
          rowsCopied += 1;
          if (opts.onProgress && rowsCopied % progressEvery === 0) {
            const elapsedMs = Date.now() - t0;
            opts.onProgress({
              rowsCopied,
              elapsedMs,
              rowsPerSec: rowsCopied / Math.max(elapsedMs / 1000, 0.001),
            });
          }
          yield pointToCopyCsvLine(importJobId, p);
        }
      })()
    );

    const copyStream = client.query(copyFrom(copySql));
    await pipeline(pointStream, copyStream);

    await client.query(
      `UPDATE explore_catalogue_import_jobs
       SET staged_point_count = $2, staging_completed_at = now(), status = 'validating', updated_at = now()
       WHERE id = $1`,
      [importJobId, rowsCopied]
    );

    if (rowsCopied !== target.expectedPointCount) {
      await client.query(
        `UPDATE explore_catalogue_import_jobs
         SET status = 'failed', failure_reason = $2, updated_at = now() WHERE id = $1`,
        [importJobId, `staged_count_mismatch:got=${rowsCopied}`]
      );
      await client.query(
        `UPDATE explore_point_catalogue_versions SET status = 'failed' WHERE id = $1`,
        [catalogueVersionId]
      );
      await client.query(`SELECT cleanup_explore_catalogue_import($1)`, [importJobId]);
      return {
        ok: false,
        dryRun: false,
        importJobId,
        catalogueVersionId,
        stagedCount: rowsCopied,
        finalCount: 0,
        durationMs: Date.now() - t0,
        status: "failed",
        regionId: target.regionId,
        nationalActive: false,
        stokeActive,
        error: `staged_count_mismatch:got=${rowsCopied}`,
      };
    }

    const finalise = await client.query(
      `SELECT finalise_explore_catalogue_import($1::uuid, $2::integer) AS result`,
      [importJobId, target.expectedPointCount]
    );
    const result = finalise.rows[0]?.result as {
      ok?: boolean;
      final_point_count?: number;
      status?: string;
      active?: boolean;
    };

    const nat = await client.query(
      `SELECT status FROM explore_point_catalogue_versions WHERE id = $1`,
      [catalogueVersionId]
    );
    const stoke2 = await client.query(
      `SELECT id FROM explore_point_catalogue_versions
       WHERE region_id = $1 AND status = 'active' LIMIT 1`,
      [STOKE_REGION_ID]
    );

    if (nat.rows[0]?.status === "active") {
      throw new Error("BUG: catalogue marked active during import");
    }

    return {
      ok: result?.ok === true && result.final_point_count === target.expectedPointCount,
      dryRun: false,
      importJobId,
      catalogueVersionId,
      stagedCount: rowsCopied,
      finalCount: Number(result?.final_point_count ?? 0),
      durationMs: Date.now() - t0,
      status: String(nat.rows[0]?.status ?? result?.status ?? "unknown"),
      regionId: target.regionId,
      nationalActive: false,
      stokeActive: (stoke2.rowCount ?? 0) > 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes(databaseUrl) || /password/i.test(msg)) {
      throw new Error("import_failed (details redacted)");
    }
    throw e;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function getNationalImportStatus(opts?: {
  regionId?: string;
}): Promise<Record<string, unknown>> {
  const databaseUrl = requireDatabaseUrl();
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const region = opts?.regionId ?? NATIONAL_REGION_ID;
    const job = await client.query(
      `SELECT * FROM explore_catalogue_import_jobs
       WHERE region_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [region]
    );
    const stoke = await client.query(
      `SELECT id, status FROM explore_point_catalogue_versions
       WHERE region_id = $1 AND status = 'active' LIMIT 1`,
      [STOKE_REGION_ID]
    );
    const nat = await client.query(
      `SELECT id, status, point_count FROM explore_point_catalogue_versions
       WHERE region_id = $1
       ORDER BY created_at DESC LIMIT 3`,
      [region]
    );
    const staging = await client.query(
      `SELECT count(*)::int AS n FROM explore_points_import_staging s
       JOIN explore_catalogue_import_jobs j ON j.id = s.import_job_id
       WHERE j.region_id = $1`,
      [region]
    );
    const row = job.rows[0] as Record<string, unknown> | undefined;
    const started = row?.started_at ? Date.parse(String(row.started_at)) : null;
    const elapsedMs = started ? Date.now() - started : null;
    const staged = Number(row?.staged_point_count ?? 0);
    const expected = Number(row?.expected_point_count ?? NATIONAL_EXPECTED_POINT_COUNT);
    const rps = elapsedMs && elapsedMs > 0 && staged > 0 ? staged / (elapsedMs / 1000) : null;
    const remaining = rps && staged < expected ? (expected - staged) / rps : null;

    return {
      import_job: row
        ? {
            id: row.id,
            status: row.status,
            expected_point_count: row.expected_point_count,
            staged_point_count: row.staged_point_count,
            final_point_count: row.final_point_count,
            failure_reason: row.failure_reason,
            catalogue_version_id: row.catalogue_version_id,
            catalogue_build_id: row.catalogue_build_id,
          }
        : null,
      rows_per_second: rps != null ? Math.round(rps) : null,
      elapsed_ms: elapsedMs,
      eta_seconds: remaining != null ? Math.round(remaining) : null,
      staging_rows: staging.rows[0]?.n ?? 0,
      national_versions: nat.rows,
      stoke_active: (stoke.rowCount ?? 0) > 0,
      national_active: nat.rows.some((r) => r.status === "active"),
      secrets_redacted: true,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
