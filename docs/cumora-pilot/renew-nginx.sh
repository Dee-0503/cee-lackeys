#!/bin/sh
set -eu
if [ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/lackeys.ceee.cloud ]; then
    /usr/sbin/nginx -t
    /usr/bin/systemctl reload nginx
fi
