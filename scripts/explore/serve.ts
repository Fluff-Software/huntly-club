/**
 * CLI: start the Explore HTTP server.
 * Usage:
 *   npm run serve   — local (loads .env via dotenv, tsx)
 *   npm run start   — production (compiled dist/, platform env)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { startExploreServer } from "./server/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  loadDotenv({ path: envPath });
}

startExploreServer();
