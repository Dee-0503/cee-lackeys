#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" = 0
if test -s /home/cee/data/codex-pilot/.cumora/computer.json; then
  systemctl enable --now cumora-byoa-pilot.service
  systemctl is-active cumora-byoa-pilot.service
  exit 0
fi
read -r -s -p 'Paste Cumora pairing code (hidden): ' pilot_code </dev/tty
printf '\n' >/dev/tty
test -n "$pilot_code"
cd /home/cee/data/codex-pilot/workspace
set +e
printf '%s' "$pilot_code" | timeout --signal=TERM --kill-after=15s 45s sudo -H -u codex-pilot /home/cee/apps/cumora-byoa-pilot/bin/node /home/cee/apps/cumora-byoa-pilot/launch.mjs --pair-stdin
pilot_result=${PIPESTATUS[1]}
unset pilot_code
set -e
if [ "$pilot_result" != 0 ] && [ "$pilot_result" != 124 ] && [ "$pilot_result" != 137 ]; then exit "$pilot_result"; fi
test -s /home/cee/data/codex-pilot/.cumora/computer.json
systemctl enable --now cumora-byoa-pilot.service
systemctl is-active cumora-byoa-pilot.service
