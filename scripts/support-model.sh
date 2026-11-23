#!/usr/bin/env bash
#
# Поднимает локальную языковую модель для чата поддержки.
# Модель маленькая (0.5B параметров), поэтому запускается на обычном ноутбуке.
#
#   ./scripts/support-model.sh            запустить модель и показать настройки
#   ./scripts/support-model.sh --stop     остановить
#
# Поддерживаются llama.cpp (llama-server) и Ollama. Если ни того, ни другого нет,
# используется Docker-образ Ollama.
#
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${SUPPORT_MODEL_PORT:-11434}"
MODEL="${SUPPORT_LLM_MODEL:-qwen2.5:0.5b-instruct}"
GGUF_REPO="Qwen/Qwen2.5-0.5B-Instruct-GGUF"
GGUF_FILE="qwen2.5-0.5b-instruct-q4_k_m.gguf"
MODELS_DIR="${HOME}/.cache/marketvault-models"
CONTAINER="marketvault-support-model"

show_settings() {
  cat <<EOF

Модель слушает порт ${PORT}. Подключение шлюза:

  export SUPPORT_LLM_URL=http://host.docker.internal:${PORT}/v1/chat/completions
  export SUPPORT_LLM_MODEL=${MODEL}

Затем перезапустите шлюз:

  docker compose up -d --force-recreate api-gateway

Проверка:

  curl -s http://127.0.0.1:4000/api/support/history

Без этих переменных чат работает на встроенном движке правил — он тоже отвечает
по-русски и видит заказы, баланс и каталог.

EOF
}

stop() {
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
  pkill -f "llama-server.*--port ${PORT}" >/dev/null 2>&1 || true
  echo "Модель остановлена."
}

if [ "${1:-}" = "--stop" ]; then
  stop
  exit 0
fi

if command -v llama-server >/dev/null 2>&1; then
  mkdir -p "${MODELS_DIR}"
  if [ ! -f "${MODELS_DIR}/${GGUF_FILE}" ]; then
    echo "Скачиваю ${GGUF_FILE} (~400 МБ)…"
    curl -fL --progress-bar -o "${MODELS_DIR}/${GGUF_FILE}" \
      "https://huggingface.co/${GGUF_REPO}/resolve/main/${GGUF_FILE}"
  fi
  echo "Запускаю llama-server на порту ${PORT}…"
  setsid nohup llama-server -m "${MODELS_DIR}/${GGUF_FILE}" \
    --host 0.0.0.0 --port "${PORT}" --ctx-size 4096 --threads 4 \
    </dev/null >/tmp/marketvault-support-model.log 2>&1 &
  sleep 4
  show_settings
  exit 0
fi

if command -v ollama >/dev/null 2>&1; then
  echo "Запускаю Ollama, модель ${MODEL}…"
  if ! ollama list 2>/dev/null | grep -q "${MODEL%%:*}"; then
    ollama pull "${MODEL}"
  fi
  OLLAMA_HOST="0.0.0.0:${PORT}" setsid nohup ollama serve \
    </dev/null >/tmp/marketvault-support-model.log 2>&1 &
  sleep 3
  show_settings
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  echo "llama.cpp и Ollama не найдены, поднимаю модель в Docker…"
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
  docker run -d --name "${CONTAINER}" -p "${PORT}:11434" \
    -v marketvault-ollama:/root/.ollama ollama/ollama >/dev/null
  sleep 5
  docker exec "${CONTAINER}" ollama pull "${MODEL}"
  show_settings
  exit 0
fi

echo "Не нашёл ни llama-server, ни ollama, ни docker." >&2
echo "Встроенный движок правил продолжит работать без модели." >&2
exit 1
