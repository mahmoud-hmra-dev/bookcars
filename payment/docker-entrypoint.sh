#!/bin/sh
set -e

DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"
DB_PASS="${DB_PASSWORD:-}"

mkdir -p /var/www/html/storage/framework/cache /var/www/html/storage/framework/sessions /var/www/html/storage/framework/views /var/www/html/storage/logs
chown -R www-data:www-data /var/www/html/storage

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
until mysqladmin ping -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" --password="${DB_PASS}" --silent; do
  sleep 2
done

if [ ! -f /var/www/html/storage/.migrated ]; then
  php artisan migrate --force
  php artisan db:seed --force || true
  touch /var/www/html/storage/.migrated
fi

php artisan config:cache || true
php artisan route:clear || true

php-fpm -D
exec nginx -g "daemon off;"
