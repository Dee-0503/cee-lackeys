#!/usr/bin/env bash
set -euo pipefail
root=/home/cee/apps/cc-switch-pilot
data=/home/cee/data/cc-switch-pilot
test ! -e "$root"
test ! -e "$data"
test "$(id -u codex-pilot)" = 10002
install -d -m 0755 "$root" "$root/releases" "$root/releases/5.10.5"
install -d -m 0700 -o 10002 -g 10002 "$data"
curl -fsSL --retry 2 -o "$root/releases/5.10.5/cc-switch.tar.gz" https://github.com/SaladDay/cc-switch-cli/releases/download/v5.10.5/cc-switch-cli-linux-x64-musl.tar.gz
printf '%s  %s\n' feda4dca0ecf01ec90708141cc346972683c27c1097fba22235c5022143f80ed "$root/releases/5.10.5/cc-switch.tar.gz" | sha256sum --check
tar -xzf "$root/releases/5.10.5/cc-switch.tar.gz" -C "$root/releases/5.10.5"
find "$root/releases/5.10.5" -maxdepth 2 -type f -printf '%f\n'
