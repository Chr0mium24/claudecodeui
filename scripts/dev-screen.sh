#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SESSION_NAME="${2:-claudecodeui-dev}"
LOG_DIR="${PROJECT_ROOT}/.screen-logs"
SERVER_LOG="${LOG_DIR}/${SESSION_NAME}-server.log"
CLIENT_LOG="${LOG_DIR}/${SESSION_NAME}-client.log"
LOCAL_NODE_BIN=""

usage() {
  cat <<'EOF'
Usage:
  scripts/dev-screen.sh [start|stop|status|attach] [session-name]

Examples:
  scripts/dev-screen.sh
  scripts/dev-screen.sh start
  scripts/dev-screen.sh stop
  scripts/dev-screen.sh attach
  scripts/dev-screen.sh status my-ui
EOF
}

ensure_dependencies() {
  if ! command -v screen >/dev/null 2>&1; then
    echo "screen is not installed."
    exit 1
  fi

  if [[ -d "${PROJECT_ROOT}/.local/node-v22.22.1-linux-x64/bin" ]]; then
    LOCAL_NODE_BIN="${PROJECT_ROOT}/.local/node-v22.22.1-linux-x64/bin"
    return
  fi

  if command -v node >/dev/null 2>&1; then
    local node_major
    node_major="$(node -p 'process.versions.node.split(".")[0]')"
    if [[ "${node_major}" -ge 22 ]]; then
      return
    fi
  fi

  echo "Node.js 22+ is required. Run the project initialization first."
  exit 1
}

clean_dead_screens() {
  screen -wipe >/dev/null 2>&1 || true
}

find_session_ids() {
  clean_dead_screens
  screen -ls | awk -v name="${SESSION_NAME}" '
    $1 ~ /^[0-9]+\./ && $0 !~ /\(Dead/ {
      split($1, parts, ".");
      if (substr($1, index($1, ".") + 1) == name) {
        print $1;
      }
    }
  '
}

first_session_id() {
  find_session_ids | head -n 1
}

session_exists() {
  [[ -n "$(first_session_id)" ]]
}

print_matching_sessions() {
  find_session_ids || true
}

start_session() {
  ensure_dependencies
  mkdir -p "${LOG_DIR}"

  if session_exists; then
    echo "screen session '${SESSION_NAME}' is already running."
    echo "Attach with: screen -r ${SESSION_NAME}"
    exit 0
  fi

  local env_prefix=""
  if [[ -n "${LOCAL_NODE_BIN}" ]]; then
    env_prefix="export PATH=\"${LOCAL_NODE_BIN}:\$PATH\";"
  fi

  local common_prefix=""
  common_prefix+="cd \"${PROJECT_ROOT}\";"
  common_prefix+="mkdir -p \"${LOG_DIR}\";"
  common_prefix+="${env_prefix}"
  common_prefix+="export npm_config_cache=\"${PROJECT_ROOT}/.npm-cache\";"
  common_prefix+="export npm_config_registry=\"https://registry.npmjs.org/\";"

  local server_cmd=""
  server_cmd+="${common_prefix}"
  server_cmd+="echo \"[$(date '+%F %T')] starting server\" >> \"${SERVER_LOG}\";"
  server_cmd+="npm run server >> \"${SERVER_LOG}\" 2>&1"

  local client_cmd=""
  client_cmd+="${common_prefix}"
  client_cmd+="echo \"[$(date '+%F %T')] starting client\" >> \"${CLIENT_LOG}\";"
  client_cmd+="npm run client -- --host 0.0.0.0 >> \"${CLIENT_LOG}\" 2>&1"

  screen -dmS "${SESSION_NAME}" -t server bash -lc "${server_cmd}"
  screen -S "${SESSION_NAME}" -X screen -t client bash -lc "${client_cmd}"

  echo "Started screen session: ${SESSION_NAME}"
  echo "Attach: screen -r ${SESSION_NAME}"
  echo "Logs:"
  echo "  ${SERVER_LOG}"
  echo "  ${CLIENT_LOG}"
}

stop_session() {
  if session_exists; then
    screen -S "${SESSION_NAME}" -X quit
    echo "Stopped screen session: ${SESSION_NAME}"
  else
    echo "screen session '${SESSION_NAME}' is not running."
  fi
}

status_session() {
  if session_exists; then
    echo "screen session '${SESSION_NAME}' is running."
    print_matching_sessions
  else
    echo "screen session '${SESSION_NAME}' is not running."
  fi
}

attach_session() {
  local session_id
  session_id="$(first_session_id)"

  if [[ -z "${session_id}" ]]; then
    echo "screen session '${SESSION_NAME}' is not running."
    exit 1
  fi

  exec screen -r "${session_id}"
}

ACTION="${1:-start}"

case "${ACTION}" in
  start)
    start_session
    ;;
  stop)
    stop_session
    ;;
  status)
    status_session
    ;;
  attach)
    attach_session
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
