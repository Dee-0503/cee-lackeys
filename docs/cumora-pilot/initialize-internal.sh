#!/usr/bin/env bash
set -euo pipefail
umask 077
pilot_root=/home/cee/apps/cumora-pilot
test "$(realpath "$pilot_root")" = "$pilot_root"
test ! -e /home/cee/data/cumora-pilot
test ! -e /home/cee/backups/cumora-pilot
if ! id cumora-pilot >/dev/null 2>&1; then
  ! getent passwd 10001 >/dev/null
  ! getent group 10001 >/dev/null
  groupadd --gid 10001 cumora-pilot
  useradd --uid 10001 --gid 10001 --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin cumora-pilot
fi
test "$(id -u cumora-pilot)" = 10001
test "$(id -g cumora-pilot)" = 10001
install -d -m 0755 /home/cee/data
install -d -m 0750 /home/cee/data/cumora-pilot
install -d -m 0700 /home/cee/data/cumora-pilot/postgres /home/cee/data/cumora-pilot/redis
install -d -m 0750 -o 10001 -g 10001 /home/cee/data/cumora-pilot/uploads /home/cee/data/cumora-pilot/logs
install -d -m 0700 /home/cee/backups/cumora-pilot
install -d -m 0750 -o root -g 10001 "$pilot_root/secrets"
for name in postgres_password agent_runtime_secret; do
  test ! -e "$pilot_root/secrets/$name"
  openssl rand -hex 32 > "$pilot_root/secrets/$name"
  chown root:10001 "$pilot_root/secrets/$name"
  chmod 0640 "$pilot_root/secrets/$name"
done
chmod 0644 "$pilot_root/runtime.mjs"
printf 'Internal credentials initialized; values not displayed.\n'
