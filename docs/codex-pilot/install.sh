#!/usr/bin/env bash
set -euo pipefail
root=/home/cee/apps/codex-pilot
data=/home/cee/data/codex-pilot
test ! -e "$root"
test ! -e "$data"
! getent passwd codex-pilot >/dev/null
! getent passwd 10002 >/dev/null
! getent group 10002 >/dev/null
groupadd --gid 10002 codex-pilot
useradd --uid 10002 --gid 10002 --home-dir "$data" --no-create-home --shell /usr/sbin/nologin codex-pilot
install -d -m 0755 "$root" "$root/releases" "$root/releases/0.155.1"
install -d -m 0700 -o 10002 -g 10002 "$data" "$data/config" "$data/workspace"
curl -fL --retry 2 -o "$root/releases/0.155.1/codex.tar.gz" https://github.com/openai/codex/releases/download/rust-v0.155.1/codex-x86_64-unknown-linux-musl.tar.gz
printf '%s  %s\n' a0ef8b2debc3bf747e07b1a039354de31300ac0dcc2276498ba281470b5d9115 "$root/releases/0.155.1/codex.tar.gz" | sha256sum --check
tar -xzf "$root/releases/0.155.1/codex.tar.gz" -C "$root/releases/0.155.1"
chmod 0755 "$root/releases/0.155.1/codex-x86_64-unknown-linux-musl"
"$root/releases/0.155.1/codex-x86_64-unknown-linux-musl" --version
