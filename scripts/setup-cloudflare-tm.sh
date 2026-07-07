#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

TUNNEL_NAME="${TUNNEL_NAME:-tm-f5qn}"
TM_HOSTNAME="${TM_HOSTNAME:-tm.f5qn.com}"
CLOUDFLARED_DIR="${CLOUDFLARED_DIR:-$HOME/.cloudflared}"
CONFIG_FILE="${CLOUDFLARED_DIR}/tm-f5qn.yml"
ORIGIN_CERT="${TUNNEL_ORIGIN_CERT:-${CLOUDFLARED_DIR}/cert.pem}"
export TM_CLOUDFLARED_UID="${TM_CLOUDFLARED_UID:-$(id -u)}"
export TM_CLOUDFLARED_GID="${TM_CLOUDFLARED_GID:-$(id -g)}"

uuid_pattern='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed." >&2
  exit 1
fi

if [ ! -f "$ORIGIN_CERT" ]; then
  cat >&2 <<EOF
Cloudflared is not logged in for account-backed tunnel management.

Run this once, choose f5qn.com in the browser, then rerun this script:
  cloudflared tunnel login

Expected cert path:
  $ORIGIN_CERT
EOF
  exit 1
fi

mkdir -p "$CLOUDFLARED_DIR"

find_tunnel_id() {
  cloudflared tunnel list --name "$TUNNEL_NAME" 2>/dev/null \
    | grep -Eo "$uuid_pattern" \
    | head -n 1
}

tunnel_id="$(find_tunnel_id || true)"

if [ -z "$tunnel_id" ]; then
  create_output="$(cloudflared tunnel create "$TUNNEL_NAME")"
  printf '%s\n' "$create_output"
  tunnel_id="$(printf '%s\n' "$create_output" | grep -Eo "$uuid_pattern" | head -n 1)"
fi

if [ -z "$tunnel_id" ]; then
  echo "Could not determine Cloudflare tunnel ID for ${TUNNEL_NAME}." >&2
  exit 1
fi

credentials_file="${CLOUDFLARED_DIR}/${tunnel_id}.json"
if [ ! -f "$credentials_file" ]; then
  echo "Missing tunnel credentials file: $credentials_file" >&2
  exit 1
fi

if [ "${OVERWRITE_DNS:-1}" = "1" ]; then
  cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$TM_HOSTNAME"
else
  cloudflared tunnel route dns "$TUNNEL_NAME" "$TM_HOSTNAME"
fi

cat > "$CONFIG_FILE" <<EOF
tunnel: ${tunnel_id}
credentials-file: /etc/cloudflared/${tunnel_id}.json

ingress:
  - hostname: ${TM_HOSTNAME}
    service: http://terraforming-mars:8080
  - service: http_status:404
EOF

docker compose --profile cloudflare up -d terraforming-mars cloudflared
docker compose ps terraforming-mars cloudflared

echo
echo "Cloudflare tunnel configured for https://${TM_HOSTNAME}"
