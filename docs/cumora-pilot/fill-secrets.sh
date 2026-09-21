#!/usr/bin/env bash
# Run interactively on cee-server with sudo; input is hidden.
set -euo pipefail
umask 077
pilot_secrets=/home/cee/apps/cumora-pilot/secrets
test "$(realpath "$pilot_secrets")" = "$pilot_secrets"
for name in openai_api_key github_client_secret; do
  if test -e "$pilot_secrets/$name"; then
    printf '%s already exists; leaving unchanged.\n' "$name"
    continue
  fi
  read -r -s -p "Enter $name (hidden): " pilot_value </dev/tty
  printf '\n' >/dev/tty
  test -n "$pilot_value"
  printf '%s' "$pilot_value" > "$pilot_secrets/$name"
  unset pilot_value
  chown root:10001 "$pilot_secrets/$name"
  chmod 0640 "$pilot_secrets/$name"
done
