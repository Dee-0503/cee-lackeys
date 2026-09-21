#!/usr/bin/env bash
set -euo pipefail
umask 027
release=/home/cee/apps/cumora-pilot/releases/v0.18.6
test "$(realpath "$release")" = "$release"
cd "$release"
printf '%s  source.tar\n' 4f9e69d1b7ee15c22673c1b2f91922dbede1661c8738080023497555c05b13a0 | sha256sum --check
mkdir source build
tar --same-permissions -xf source.tar -C source
{
 printf 'tag=v0.18.6\ncommit=1a82fe6383fe02a18c643fafedf61d4a0d1a4439\nsource_sha256=4f9e69d1b7ee15c22673c1b2f91922dbede1661c8738080023497555c05b13a0\n'
 date -u +build_started=%FT%TZ
} > build/provenance.txt
set +e
sudo -n docker build --progress=plain --iidfile "$release/build/image-id.txt" \
 --label org.opencontainers.image.revision=1a82fe6383fe02a18c643fafedf61d4a0d1a4439 \
 --label org.opencontainers.image.version=0.18.6 \
 -f source/server/docker/cumora-server.Dockerfile -t cumora-pilot/server:v0.18.6-1a82fe6383fe source 2>&1 | tee build/build.log
result=${PIPESTATUS[0]}
set -e
printf 'build_exit=%s\n' "$result" >> build/provenance.txt
date -u +build_finished=%FT%TZ >> build/provenance.txt
test "$result" = 0
sudo -n docker image inspect cumora-pilot/server:v0.18.6-1a82fe6383fe --format '{{.Id}} {{json .RepoDigests}}' | tee -a build/provenance.txt
