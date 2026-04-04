#!/bin/sh
set -e

# Ensure CDN directories exist and are writable by the app user
# This runs as root before switching to the app user via gosu/su-exec
CDN_BASE="/var/www/cdn/bookcars"

mkdir -p \
  "$CDN_BASE/users" \
  "$CDN_BASE/cars" \
  "$CDN_BASE/temp"

chown -R app:app "$CDN_BASE"

# Drop privileges and run the app
exec su-exec app sh -c "node dist/src/setup/setup.js && node --import ./dist/src/monitoring/instrument.js dist/src"
