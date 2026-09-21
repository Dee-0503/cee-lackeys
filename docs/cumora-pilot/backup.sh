#!/usr/bin/env bash
# Cold pilot-only backup. Leaves services stopped for operator-controlled restart.
set -euo pipefail
umask 077
pilot_root=/home/cee/apps/cumora-pilot
compose=(docker compose -p cumora-pilot -f "$pilot_root/compose.yaml")
pilot_backup=$(mktemp -d /home/cee/backups/cumora-pilot/snapshot.XXXXXXXX)
"${compose[@]}" stop server
"${compose[@]}" exec -T postgres pg_dump -U cumora -d cumora -Fc > "$pilot_backup/postgres.dump"
"${compose[@]}" exec -T postgres pg_restore --list < "$pilot_backup/postgres.dump" > "$pilot_backup/postgres.list"
"${compose[@]}" stop redis
tar -cpf "$pilot_backup/redis.tar" -C /home/cee/data/cumora-pilot redis
tar -cpf "$pilot_backup/uploads.tar" -C /home/cee/data/cumora-pilot uploads
tar -cpf "$pilot_backup/config.tar" -C "$pilot_root" compose.yaml runtime.mjs runtime.env build/provenance.txt
sha256sum "$pilot_backup/postgres.dump" "$pilot_backup/redis.tar" "$pilot_backup/uploads.tar" "$pilot_backup/config.tar" > "$pilot_backup/SHA256SUMS"
printf 'Backup written to %s; Redis/server remain stopped.\n' "$pilot_backup"
