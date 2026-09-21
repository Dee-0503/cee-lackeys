#!/usr/bin/env bash
# Build only. Does not start services or load runtime credentials.
set -euo pipefail
umask 027
pilot_root=/home/cee/apps/cumora-pilot
pilot_sha=324159d643bacc8cd271dbf2491da2b58046c8b1
pilot_tar_sha=d70bd9e79f45a9e3f578784559c0b964cdf37c9bf63061fb0d57c9b9d5611570
pilot_image=cumora-pilot/server:v0.18.5-324159d643ba
test "$(realpath "$pilot_root")" = "$pilot_root"
cd "$pilot_root"
printf '%s  %s\n' "$pilot_tar_sha" source-v0.18.5.tar | sha256sum --check
test -z "$(find source -mindepth 1 -maxdepth 1 -print -quit)"
tar --same-permissions -xf source-v0.18.5.tar -C source
test -f source/server/docker/cumora-server.Dockerfile
test -f source/package-lock.json
{
  printf 'source_repository=https://github.com/yetone/cumora\ntag=v0.18.5\ncommit=%s\nsource_tar_sha256=%s\nimage_tag=%s\n' "$pilot_sha" "$pilot_tar_sha" "$pilot_image"
  printf 'build_started_at='; date -u +%Y-%m-%dT%H:%M:%SZ
  printf 'deployment_started=false\n'
  sha256sum source/server/docker/cumora-server.Dockerfile source/server/docker/cumora-server.Dockerfile.dockerignore source/package-lock.json
} > build/provenance.txt
set +e
sudo -n docker build --progress=plain --iidfile "$pilot_root/build/image-id.txt" \
  --label "org.opencontainers.image.revision=$pilot_sha" \
  --label org.opencontainers.image.version=0.18.5 \
  --label org.opencontainers.image.source=https://github.com/yetone/cumora \
  -f source/server/docker/cumora-server.Dockerfile -t "$pilot_image" source \
  2>&1 | tee build/build.log
pilot_exit=${PIPESTATUS[0]}
set -e
{
  printf 'build_exit_code=%s\n' "$pilot_exit"
  printf 'build_finished_at='; date -u +%Y-%m-%dT%H:%M:%SZ
} >> build/provenance.txt
if [ "$pilot_exit" -eq 0 ]; then
  sudo -n docker image inspect "$pilot_image" --format '{{json .}}' > build/image-inspect.json
  sudo -n docker image inspect "$pilot_image" --format 'image_id={{.Id}} repo_digests={{json .RepoDigests}}' | tee -a build/provenance.txt
fi
exit "$pilot_exit"
