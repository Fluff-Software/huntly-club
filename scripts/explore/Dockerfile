# SUPERSEDED (Step 10.2): Cloud Run is not the active Explore hosting path.
# See docs/explore/step-10-2-supabase-edge-on-demand-osm.md
# This Dockerfile remains as reference fallback only — do not deploy to GCP for MVP.
#
# Huntly Explore API — container reference (Step 10, superseded)
# Build from scripts/explore (requires prepared OSM extract):
#   npm run prepare:osm   # once, if fixtures/local/*.geojson missing
#   docker build -t huntly-explore-dev .
# Run:
#   docker run --rm -p 4310:4310 --env-file .env huntly-explore-dev

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY *.ts ./
COPY server ./server
COPY fixtures/osm-data-revision.json ./fixtures/osm-data-revision.json
COPY fixtures/test-area.geojson ./fixtures/test-area.geojson
# Prepared OSM extract (gitignored) — must exist on the build machine
COPY fixtures/local/stoke-sneyd-green.geojson ./fixtures/local/stoke-sneyd-green.geojson
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    EXPLORE_SERVER_HOST=0.0.0.0 \
    EXPLORE_SERVER_PORT=4310 \
    EXPLORE_OSM_DATA_PATH=/app/fixtures/local/stoke-sneyd-green.geojson \
    EXPLORE_REQUIRE_AUTH_CONFIG=1 \
    EXPLORE_LOG_LEVEL=info

RUN groupadd --system explore && useradd --system --gid explore --create-home explore

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/fixtures ./fixtures

USER explore
EXPOSE 4310

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||process.env.EXPLORE_SERVER_PORT||4310)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/serve.js"]
