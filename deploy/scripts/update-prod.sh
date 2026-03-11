#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${ROOT_DIR}"
git pull --ff-only

USE_TUNNEL="${USE_TUNNEL:-true}" "${ROOT_DIR}/deploy/scripts/deploy-prod.sh" "${1:-${ROOT_DIR}/deploy/.env.production}"
