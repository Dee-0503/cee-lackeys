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
SKILLS=(
  autoresearch canvas defuddle obsidian-bases obsidian-markdown save think
  wiki-cli wiki-fold wiki-ingest wiki-lint wiki-mode wiki-query wiki-retrieve wiki
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

install_skill_links() {
  local home=$1 skill target link
  install -d -m 0700 -o codex-pilot -g codex-pilot "$home/.agents/skills"
  for skill in "${SKILLS[@]}"; do
    target="$home/.agents/skills/$skill"
    link="../../.vendor/claude-obsidian/skills/$skill"
    if test -L "$target"; then
      test "$(readlink "$target")" = "$link" || {
        echo "unexpected Wiki skill link: $target" >&2
        exit 1
      }
    elif test -e "$target"; then
      echo "existing non-symlink blocks Wiki skill: $target" >&2
      exit 1
    else
      ln -s "$link" "$target"
    fi
  done
}

start() {
  require_root
  for agent in "${AGENTS[@]}"; do
    home="$AGENTS_ROOT/$agent"
    test "$(realpath "$home")" = "$home"
    mount_one "$WIKI_ROOT" "$home/workspace/cee-wiki"
    mount_one "$CORE_ROOT" "$home/.vendor/claude-obsidian" 1
    install_skill_links "$home"
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
