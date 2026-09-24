export type NearbyQuery = {
  latitude: number;
  longitude: number;
  radiusMetres: number;
  generationVersion: number;
};

export type ValidationFailure = {
  ok: false;
  status: number;
  error: string;
  details?: Record<string, unknown>;
};

export type ValidationSuccess = {
  ok: true;
  query: NearbyQuery;
};

export const DEFAULT_MAX_RADIUS_METRES = 2000;
export const SUPPORTED_GENERATION_VERSIONS = new Set([2]);

function parseNumber(value: string | null, name: string): number | ValidationFailure {
  if (value == null || value.trim() === "") {
    return {
      ok: false,
      status: 400,
      error: "missing_parameter",
      details: { parameter: name },
    };
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return {
      ok: false,
      status: 400,
      error: "invalid_parameter",
      details: { parameter: name, value },
    };
  }
  return n;
}

/**
 * Parse and validate GET /explore/stops/nearby query params.
 */
export function validateNearbyQuery(
  searchParams: URLSearchParams,
  options?: { maxRadiusMetres?: number }
): ValidationSuccess | ValidationFailure {
  const maxRadius = options?.maxRadiusMetres ?? DEFAULT_MAX_RADIUS_METRES;

  const latitudeRaw = parseNumber(searchParams.get("latitude"), "latitude");
  if (typeof latitudeRaw !== "number") return latitudeRaw;
  const longitudeRaw = parseNumber(searchParams.get("longitude"), "longitude");
  if (typeof longitudeRaw !== "number") return longitudeRaw;
  const radiusRaw = parseNumber(searchParams.get("radius_metres"), "radius_metres");
  if (typeof radiusRaw !== "number") return radiusRaw;

  const versionParam = searchParams.get("generation_version");
  const versionRaw =
    versionParam == null || versionParam.trim() === ""
      ? 2
      : parseNumber(versionParam, "generation_version");
  if (typeof versionRaw !== "number") return versionRaw;

  if (latitudeRaw < -90 || latitudeRaw > 90) {
    return {
      ok: false,
      status: 400,
      error: "invalid_latitude",
      details: { latitude: latitudeRaw },
    };
  }
  if (longitudeRaw < -180 || longitudeRaw > 180) {
    return {
      ok: false,
      status: 400,
      error: "invalid_longitude",
      details: { longitude: longitudeRaw },
    };
  }
  if (radiusRaw <= 0) {
    return {
      ok: false,
      status: 400,
      error: "invalid_radius",
      details: { radius_metres: radiusRaw },
    };
  }
  if (radiusRaw > maxRadius) {
    return {
      ok: false,
      status: 400,
      error: "radius_too_large",
      details: { radius_metres: radiusRaw, max_radius_metres: maxRadius },
    };
  }
  if (!SUPPORTED_GENERATION_VERSIONS.has(versionRaw)) {
    return {
      ok: false,
      status: 400,
      error: "unsupported_generation_version",
      details: {
        generation_version: versionRaw,
        supported: [...SUPPORTED_GENERATION_VERSIONS],
      },
    };
  }

  return {
    ok: true,
    query: {
      latitude: latitudeRaw,
      longitude: longitudeRaw,
      radiusMetres: radiusRaw,
      generationVersion: versionRaw,
    },
  };
}
