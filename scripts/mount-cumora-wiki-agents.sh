#!/usr/bin/env bash
set -euo pipefail

# The BYOA sandbox exposes each agent home, not arbitrary /home/cee/data paths.
# Bind-mount the single canonical Vault into each agent's workspace and expose
# the fixed Wiki core read-only beside the installed skills.

WIKI_ROOT=/home/cee/data/cee-wiki/canonical
CORE_ROOT=/home/cee/data/cee-wiki/core
AGENTS_ROOT=/home/cee/data/codex-pilot/.cumora/agents
AGENTS=(
  atlas-12fd
  bram-ba89
  iris-a25c
  lackeys-knowledge
  lackeys-meeting
  lackeys-operations
  lackeys-subscriptions
  lackeys-tasks
  nova-02ef
)

require_root() {
  test "$(id -u)" -eq 0 || { echo 'must run as root' >&2; exit 1; }
  test "$(realpath "$WIKI_ROOT")" = "$WIKI_ROOT"
  test "$(realpath "$CORE_ROOT")" = "$CORE_ROOT"
  test -d "$WIKI_ROOT" && test -d "$CORE_ROOT"
}

mount_one() {
  local source=$1 target=$2 readonly=${3:-0}
  install -d -m 0700 -o codex-pilot -g codex-pilot "$target"
  if mountpoint -q "$target"; then
    return
  fi
  mount --bind "$source" "$target"
  if test "$readonly" = 1; then
    mount -o remount,bind,ro "$target"
  fi
}

unmount_one() {
  local target=$1
  if mountpoint -q "$target"; then
    umount "$target"
  fi
}

start() {
  require_root
  for agent in "${AGENTS[@]}"; do
    home="$AGENTS_ROOT/$agent"
    test "$(realpath "$home")" = "$home"
    mount_one "$WIKI_ROOT" "$home/workspace/cee-wiki"
    mount_one "$CORE_ROOT" "$home/.vendor/claude-obsidian" 1
  done
}

stop() {
  require_root
  for ((i=${#AGENTS[@]}-1; i>=0; i--)); do
    home="$AGENTS_ROOT/${AGENTS[$i]}"
    unmount_one "$home/.vendor/claude-obsidian"
    unmount_one "$home/workspace/cee-wiki"
  done
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  *) echo "Usage: $0 start|stop" >&2; exit 2 ;;
esac
