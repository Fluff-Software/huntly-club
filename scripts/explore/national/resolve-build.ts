/**
 * Resolve a national catalogue build directory (Step 10.4).
 */
import fs from "node:fs";
import path from "node:path";

export function findLatestBuildDir(outputRoot: string): string | null {
  if (!fs.existsSync(outputRoot)) return null;
  const dirs = fs
    .readdirSync(outputRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("build_"))
    .map((d) => d.name)
    .sort()
    .reverse();
  return dirs[0] ? path.join(outputRoot, dirs[0]) : null;
}

/**
 * Resolve --build-dir (absolute or relative) or latest under outputRoot.
 */
export function resolveBuildDir(opts: {
  outputRoot: string;
  buildDir?: string;
  cwd?: string;
}): string {
  if (opts.buildDir) {
    const raw = opts.buildDir;
    const resolved = path.isAbsolute(raw)
      ? raw
      : path.resolve(opts.cwd ?? process.cwd(), raw);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Build dir not found: ${resolved}`);
    }
    return resolved;
  }
  const latest = findLatestBuildDir(opts.outputRoot);
  if (!latest) {
    throw new Error(`No build_* directory under ${opts.outputRoot}`);
  }
  return latest;
}
