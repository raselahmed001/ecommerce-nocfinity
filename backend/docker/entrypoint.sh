#!/bin/sh
# Starts the API inside Docker: wait for MySQL, create the tables and demo data, serve.
set -e

cd /app

echo "Waiting for the database at ${DB_HOST}:${DB_PORT:-3306} ..."
until php -r '
    try {
        new PDO("mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT") ?: 3306).";dbname=".getenv("DB_DATABASE"), getenv("DB_USERNAME"), getenv("DB_PASSWORD"));
    } catch (Throwable $e) {
        exit(1);
    }
'; do
    sleep 2
done

# Seeders can be run again safely: they update or skip rows that already exist.
php artisan migrate --seed --force
php artisan storage:link >/dev/null 2>&1 || true
php artisan config:clear >/dev/null

echo "API ready on http://127.0.0.1:8000"
exec php artisan serve --host=0.0.0.0 --port=8000
