#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SESSION_NAME="${2:-claudecodeui-prod}"
LOG_DIR="${PROJECT_ROOT}/.screen-logs"
APP_LOG="${LOG_DIR}/${SESSION_NAME}.log"
LOCAL_NODE_BIN=""

usage() {
  cat <<'EOF'
Usage:
  scripts/prod-screen.sh [start|stop|status|attach] [session-name]

Examples:
  scripts/prod-screen.sh
  scripts/prod-screen.sh start
  scripts/prod-screen.sh stop
  scripts/prod-screen.sh attach
  scripts/prod-screen.sh status my-ui
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

  local app_cmd=""
  app_cmd+="cd \"${PROJECT_ROOT}\";"
  app_cmd+="mkdir -p \"${LOG_DIR}\";"
  app_cmd+="${env_prefix}"
  app_cmd+="export npm_config_cache=\"${PROJECT_ROOT}/.npm-cache\";"
  app_cmd+="export npm_config_registry=\"https://registry.npmjs.org/\";"
  app_cmd+="echo \"[$(date '+%F %T')] building production bundle\" >> \"${APP_LOG}\";"
  app_cmd+="npm run build >> \"${APP_LOG}\" 2>&1 && "
  app_cmd+="echo \"[$(date '+%F %T')] starting production server\" >> \"${APP_LOG}\";"
  app_cmd+="npm run server >> \"${APP_LOG}\" 2>&1"

  screen -dmS "${SESSION_NAME}" -t app bash -lc "${app_cmd}"

  echo "Started production screen session: ${SESSION_NAME}"
  echo "Attach: screen -r ${SESSION_NAME}"
  echo "Log:"
  echo "  ${APP_LOG}"
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
