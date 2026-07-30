/**
 * Check local tooling required for Geofabrik PBF national catalogues (Step 10.4).
 *
 * Usage: npm run check:pbf-tools
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

type ToolResult = { name: string; ok: boolean; detail: string };

function which(cmd: string): string | null {
  const r = spawnSync("which", [cmd], { encoding: "utf8" });
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

function checkOsmium(): ToolResult {
  const path = which("osmium");
  if (!path) {
    return {
      name: "osmium",
      ok: false,
      detail:
        "Not found. Install osmium-tool (e.g. `brew install osmium-tool`). Required for PBF extract / tag filter / polygon clip.",
    };
  }
  const ver = spawnSync("osmium", ["--version"], { encoding: "utf8" });
  return {
    name: "osmium",
    ok: ver.status === 0,
    detail: ver.stdout.trim().split("\n")[0] ?? path,
  };
}

function checkCurl(): ToolResult {
  const path = which("curl");
  return {
    name: "curl",
    ok: Boolean(path),
    detail: path ?? "Not found (needed for Geofabrik download / resume).",
  };
}

function checkDisk(): ToolResult {
  try {
    const free = fs.statfsSync(process.cwd());
    const freeBytes = Number(free.bavail) * Number(free.bsize);
    const freeGiB = freeBytes / (1024 ** 3);
    const ok = freeGiB >= 40;
    return {
      name: "disk",
      ok,
      detail: `${freeGiB.toFixed(1)} GiB free on cwd volume — recommend ≥40 GiB before national intermediates (PBF ~1–2 GiB + partitions + chunks).`,
    };
  } catch {
    const free = os.freemem() / (1024 ** 3);
    return {
      name: "disk",
      ok: false,
      detail: `Could not statfs cwd; process freemem≈${free.toFixed(1)} GiB (unreliable for disk planning).`,
    };
  }
}

function main() {
  const results = [checkOsmium(), checkCurl(), checkDisk()];
  let failed = false;
  for (const r of results) {
    const mark = r.ok ? "OK" : "MISSING";
    console.log(`[${mark}] ${r.name}: ${r.detail}`);
    if (!r.ok && r.name !== "disk") failed = true;
    if (!r.ok && r.name === "disk") {
      console.log("  WARN: low disk — preflight will block --confirm-full-run");
    }
  }
  if (failed) {
    console.log("\nInstall missing tools, then re-run: npm run check:pbf-tools");
    process.exit(1);
  }
  console.log("\nPBF tooling check passed (disk warning may still apply).");
}

main();
