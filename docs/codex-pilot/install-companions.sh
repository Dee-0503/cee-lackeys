#!/usr/bin/env bash
set -euo pipefail
release=/home/cee/apps/codex-pilot/releases/0.155.1
test "$(realpath "$release")" = "$release"
curl -fsSL --retry 2 -o "$release/code-mode-host.tar.gz" https://github.com/openai/codex/releases/download/rust-v0.155.1/codex-code-mode-host-x86_64-unknown-linux-musl.tar.gz
curl -fsSL --retry 2 -o "$release/bwrap.tar.gz" https://github.com/openai/codex/releases/download/rust-v0.155.1/bwrap-x86_64-unknown-linux-musl.tar.gz
printf '%s  %s\n' 9fd083743af55be818aceb351d371fb5136f5b6aa3938f167087373d27067b2d "$release/code-mode-host.tar.gz" d94f189cac440eb601dea980a44a40a4bb40452fd21c06a2abfe464f293795b6 "$release/bwrap.tar.gz" | sha256sum --check
tar -xzf "$release/code-mode-host.tar.gz" -C "$release"
tar -xzf "$release/bwrap.tar.gz" -C "$release"
find "$release" -maxdepth 2 -type f -printf '%f\n'
