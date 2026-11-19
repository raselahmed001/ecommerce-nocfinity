# Backend (Laravel API)

Setup, environment variables, accounts and architecture notes are in the [main README](../README.md).

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
php artisan test
```

API reference: [docs/API.md](../docs/API.md). Postman collection: [docs/SHOP.CO.postman_collection.json](../docs/SHOP.CO.postman_collection.json).
