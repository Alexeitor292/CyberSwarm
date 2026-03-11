#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/deploy/docker-compose.prod.yml"
ENV_FILE="${1:-${ROOT_DIR}/deploy/.env.production}"
USE_TUNNEL="${USE_TUNNEL:-false}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  echo "Copy deploy/.env.production.example to deploy/.env.production and fill values."
  exit 1
fi

COMPOSE_ARGS=(--env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

if [[ "${USE_TUNNEL}" == "true" ]]; then
  PROFILE_ARGS=(--profile tunnel)
else
  PROFILE_ARGS=()
fi

echo "Building production image..."
docker compose "${COMPOSE_ARGS[@]}" "${PROFILE_ARGS[@]}" build --pull

echo "Starting production stack..."
docker compose "${COMPOSE_ARGS[@]}" "${PROFILE_ARGS[@]}" up -d --remove-orphans

echo "Active containers:"
docker compose "${COMPOSE_ARGS[@]}" "${PROFILE_ARGS[@]}" ps
