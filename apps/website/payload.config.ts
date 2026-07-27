/**
 * The real config lives in payload-src/, which has its own nested
 * package.json declaring "type": "module". @payloadcms/richtext-lexical has
 * a top-level await internally, which needs genuine ESM to load - Node
 * resolves module type from the *nearest* package.json to the file being
 * loaded, so scoping "type": "module" to payload-src/ fixes that for the
 * Payload CLI (which is pointed here via PAYLOAD_CONFIG_PATH in package.json
 * scripts) without touching this app's own package.json, which needs to stay
 * off "type": "module" for Next's dev server to work on Next 15.
 *
 * Next.js itself doesn't care about any of this - webpack bundles TypeScript
 * by file extension, not by package.json "type", so it resolves this stub
 * and payload-src/payload.config.ts exactly like any other local import.
 */
export { default } from "./payload-src/payload.config";
