#!/usr/bin/env bash
#
# Постоянный туннель Cloudflare для домена (вместо временного trycloudflare).
# Адрес не меняется между перезапусками.
#
#   ./scripts/tunnel.sh             поднять туннель и привязать домен
#   ./scripts/tunnel.sh --service   поставить user-сервис systemd (автозапуск)
#
# Переменные: DOMAIN (по умолчанию marketvaultacademy.ru),
#             TUNNEL_NAME, ORIGIN (по умолчанию http://localhost:3000).
set -euo pipefail

cd "$(dirname "$0")/.."

DOMAIN="${DOMAIN:-marketvaultacademy.ru}"
NAME="${TUNNEL_NAME:-marketvault-academy}"
ORIGIN="${ORIGIN:-http://localhost:3000}"
CF_DIR="${HOME}/.cloudflared"
CONFIG="${CF_DIR}/config.yml"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Не найден cloudflared. Установите: sudo pacman -S cloudflared" >&2
  exit 1
fi

if [ ! -f "${CF_DIR}/cert.pem" ]; then
  cat >&2 <<EOF

Нужна авторизация в Cloudflare (делается один раз):

  1. В панели Cloudflare добавьте домен ${DOMAIN} (Add a site) и у регистратора
     смените NS на те, что покажет Cloudflare.
  2. Дождитесь статуса Active, затем выполните:

       cloudflared tunnel login

  3. Повторите: ./scripts/tunnel.sh

EOF
  exit 1
fi

if ! cloudflared tunnel list --name "${NAME}" 2>/dev/null | grep -q "${NAME}"; then
  cloudflared tunnel create "${NAME}"
fi

TUNNEL_ID=$(cloudflared tunnel list --name "${NAME}" --output json 2>/dev/null \
  | python3 -c 'import sys,json; data=json.load(sys.stdin); print(data[0]["id"])')

mkdir -p "${CF_DIR}"
cat > "${CONFIG}" <<YAML
tunnel: ${TUNNEL_ID}
credentials-file: ${CF_DIR}/${TUNNEL_ID}.json

ingress:
  - hostname: ${DOMAIN}
    service: ${ORIGIN}
  - hostname: www.${DOMAIN}
    service: ${ORIGIN}
  - service: http_status:404
YAML

cloudflared tunnel route dns "${NAME}" "${DOMAIN}" || true
cloudflared tunnel route dns "${NAME}" "www.${DOMAIN}" || true

if [ "${1:-}" = "--service" ]; then
  mkdir -p "${HOME}/.config/systemd/user"
  cat > "${HOME}/.config/systemd/user/cloudflared-marketvault.service" <<UNIT
[Unit]
Description=Cloudflare tunnel for MarketVault Academy
After=network-online.target

[Service]
ExecStart=$(command -v cloudflared) tunnel --config ${CONFIG} run ${NAME}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable --now cloudflared-marketvault.service
  loginctl enable-linger "${USER}" 2>/dev/null || true
  echo "Сервис запущен. Статус: systemctl --user status cloudflared-marketvault"
  echo "Домен: https://${DOMAIN}"
  exit 0
fi

echo "Домен https://${DOMAIN} -> ${ORIGIN}"
exec cloudflared tunnel --config "${CONFIG}" run "${NAME}"
