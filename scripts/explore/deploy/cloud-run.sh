#!/usr/bin/env bash
# SUPERSEDED (Step 10.2): Do not deploy Explore to Google Cloud Run for MVP.
# Active path: Supabase Edge Functions — docs/explore/step-10-2-supabase-edge-on-demand-osm.md
#
# Historical: Deploy Huntly Explore API to Google Cloud Run (development).
# Prerequisites: gcloud auth, APIs enabled, OSM extract prepared, Docker.
#
# Usage:
#   export GCP_PROJECT=your-project
#   export EXPLORE_SUPABASE_URL=...
#   export EXPLORE_SUPABASE_ANON_KEY=...
#   export EXPLORE_SUPABASE_SERVICE_ROLE_KEY=...
#   ./deploy/cloud-run.sh
set -euo pipefail

echo "ERROR: Cloud Run deploy is superseded by Step 10.2 (Supabase Edge)." >&2
echo "See docs/explore/step-10-2-supabase-edge-on-demand-osm.md" >&2
exit 1

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${GCP_PROJECT:?Set GCP_PROJECT}"
REGION="${GCP_REGION:-europe-west2}"
SERVICE="${EXPLORE_CLOUD_RUN_SERVICE:-huntly-explore-dev}"
IMAGE="${EXPLORE_IMAGE:-${REGION}-docker.pkg.dev/${PROJECT}/huntly/explore-dev:$(git rev-parse --short HEAD 2>/dev/null || echo local)}"
PORT="${EXPLORE_SERVER_PORT:-4310}"

if [[ ! -f fixtures/local/stoke-sneyd-green.geojson ]]; then
  echo "Missing OSM extract. Run: npm run prepare:osm" >&2
  exit 1
fi

echo "Building image ${IMAGE}"
docker build -t "${IMAGE}" .

echo "Pushing ${IMAGE}"
docker push "${IMAGE}"

echo "Deploying Cloud Run service ${SERVICE}"
gcloud run deploy "${SERVICE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --image="${IMAGE}" \
  --platform=managed \
  --allow-unauthenticated \
  --port="${PORT}" \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --set-env-vars="EXPLORE_REQUIRE_AUTH_CONFIG=1,EXPLORE_LOG_LEVEL=info,EXPLORE_ALLOWED_ORIGINS=*,EXPLORE_OSM_DATA_PATH=/app/fixtures/local/stoke-sneyd-green.geojson" \
  --set-secrets="EXPLORE_SUPABASE_URL=explore-supabase-url:latest,EXPLORE_SUPABASE_ANON_KEY=explore-supabase-anon:latest,EXPLORE_SUPABASE_SERVICE_ROLE_KEY=explore-supabase-service-role:latest"

URL="$(gcloud run services describe "${SERVICE}" --project="${PROJECT}" --region="${REGION}" --format='value(status.url)')"
echo "Deployed: ${URL}"
echo "Health:   ${URL}/health"
echo "Set EXPO_PUBLIC_EXPLORE_API_URL=${URL} for EAS development builds (or map explore-dev.huntly.world)."
