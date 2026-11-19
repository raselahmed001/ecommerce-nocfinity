# Frontend (Next.js storefront and admin panel)

Setup, environment variables and accounts are in the [main README](../README.md).

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_STRIPE_KEY (pk_test_...)
npm run dev                  # http://localhost:3000
```

- Storefront: `/`  Admin panel: `/admin/login`
- The app talks to the Laravel API only (`NEXT_PUBLIC_API_URL`).
