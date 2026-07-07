#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

export TM_PORT="${TM_PORT:-18080}"

docker compose build --pull terraforming-mars
docker compose up -d --force-recreate terraforming-mars
docker compose ps terraforming-mars
