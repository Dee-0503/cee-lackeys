#!/usr/bin/env bash
set -euo pipefail
umask 027
pilot=/home/cee/apps/cumora-pilot
release=$pilot/releases/v0.18.6
compose=(docker compose -p cumora-pilot -f "$pilot/compose.yaml")
test "$(realpath "$pilot")" = "$pilot"
test -s "$release/build/image-id.txt"
test -f "$release/compose.next.yaml"
cmp "$pilot/compose.yaml" "$release/compose.previous.yaml"
docker compose -p cumora-pilot --project-directory "$pilot" -f "$release/compose.next.yaml" config --quiet
rollback() {
  printf 'Upgrade failed; restoring previous fixed image configuration.\n'
  install -m 644 "$release/compose.previous.yaml" "$pilot/compose.yaml"
  "${compose[@]}" up -d --wait server
}
trap rollback ERR
bash "$pilot/backup.sh" | tee "$release/build/pre-upgrade-backup.txt"
install -m 644 "$release/compose.next.yaml" "$pilot/compose.yaml"
"${compose[@]}" up -d --wait server
"${compose[@]}" exec -T server node -e 'if(require("./package.json").version!=="0.18.6")process.exit(1);console.log("version=0.18.6")'
"${compose[@]}" exec -T postgres psql -U cumora -d cumora -Atc "SELECT key,value FROM app_settings; SELECT count(*) FROM user_identities;"
date -u +deployed_at=%FT%TZ | tee -a "$release/build/provenance.txt"
trap - ERR
