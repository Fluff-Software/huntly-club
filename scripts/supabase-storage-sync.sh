#!/usr/bin/env bash

set -euo pipefail

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dryrun"
else
  DRY_RUN=""
fi

required_env_vars=(
  SOURCE_SUPABASE_PROJECT_REF
  TARGET_SUPABASE_PROJECT_REF
  SOURCE_AWS_ACCESS_KEY_ID
  SOURCE_AWS_SECRET_ACCESS_KEY
  TARGET_AWS_ACCESS_KEY_ID
  TARGET_AWS_SECRET_ACCESS_KEY
)

for var_name in "${required_env_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}" >&2
    exit 1
  fi
done

SOURCE_ENDPOINT="https://${SOURCE_SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3"
TARGET_ENDPOINT="https://${TARGET_SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

buckets=(
  activity-images
  user-activity-photos
  badges
  season-images
  story-slides
  parent-resources
  category-icons
)

for bucket in "${buckets[@]}"; do
  echo "Syncing bucket: ${bucket}"
  BUCKET_DIR="${WORK_DIR}/${bucket}"
  mkdir -p "${BUCKET_DIR}"

  AWS_ACCESS_KEY_ID="${SOURCE_AWS_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${SOURCE_AWS_SECRET_ACCESS_KEY}" \
  AWS_DEFAULT_REGION="us-east-1" \
  aws --endpoint-url "${SOURCE_ENDPOINT}" s3 sync \
    "s3://${bucket}" "${BUCKET_DIR}" ${DRY_RUN}

  AWS_ACCESS_KEY_ID="${TARGET_AWS_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${TARGET_AWS_SECRET_ACCESS_KEY}" \
  AWS_DEFAULT_REGION="us-east-1" \
  aws --endpoint-url "${TARGET_ENDPOINT}" s3 sync \
    "${BUCKET_DIR}" "s3://${bucket}" --delete ${DRY_RUN}
done

echo "Storage sync completed."
