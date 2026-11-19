# SHOP.CO: e-commerce test project

A working online store with a customer storefront and a permission-based admin panel.

- **Backend:** Laravel 12, Sanctum tokens, Spatie Permission, MySQL 8, Stripe (test mode)
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS. It talks to Laravel only through the JSON API (no Blade pages; Blade is used only for the email template).
- Niche: clothing (T-shirts, shirts, jeans, shorts, hoodies) in four dress styles (Casual, Formal, Party, Gym). The storefront follows the supplied Figma template (SHOP.CO).

```
backend/    Laravel API
frontend/   Next.js storefront (/) and admin panel (/admin)
docs/       API.md (API reference) and a Postman collection
```

## Quick start

### What to install first

**Shortest way:** install only [Docker Desktop](https://www.docker.com/products/docker-desktop/) and run `docker compose up --build` (see "Option A: Docker" below). The list here is for running without Docker.

| Tool | Version | Notes |
|---|---|---|
| PHP | 8.3 or newer | Extensions: `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd` (all included in Laragon) |
| Composer | 2.x | https://getcomposer.org |
| Node.js + npm | 20 or newer | https://nodejs.org |
| MySQL | 8 | Laragon includes it. Any MySQL 8 server works. |
| Mailpit | any | Catches the emails (password reset, verification, order status). Laragon includes it. https://mailpit.axllent.org |
| Stripe account | free, test mode | Only needed to pay at checkout (see "Stripe" below) |

On Windows the easiest way is [Laragon](https://laragon.org) (PHP, Composer, MySQL and Mailpit in one installer) plus Node.js.

### Start everything (after the setup steps below)

Use three terminals, or two if you skip Mailpit:

```bash
# 1. Backend API
cd backend
php artisan serve --port=8000

# 2. Frontend
cd frontend
npm run dev

# 3. Mailpit (Laragon: start it from the menu, or run mailpit.exe)
```

MySQL must be running too.

| What | URL |
|---|---|
| Storefront | http://localhost:3000 |
| Customer login | http://localhost:3000/login |
| Admin panel login | http://localhost:3000/admin/login |
| Backend API (base URL) | http://127.0.0.1:8000/api/v1 |
| Mailpit inbox (all emails) | http://127.0.0.1:8025 |

### Login accounts

Every account has the same password: **`Password@123`**. They are created by `php artisan migrate --seed`.

Admin panel (sign in at http://localhost:3000/admin/login):

| Role | Email | Can do |
|---|---|---|
| Super Admin | `superadmin@example.com` | Everything, including roles and permissions. Cannot be edited. |
| Admin | `admin@example.com` | Everything except roles and permissions |
| Product Manager | `product@example.com` | Products, categories, reviews |
| Order Manager | `orders@example.com` | Orders, customers, dashboard |
| Support | `support@example.com` | View orders, customers and products; moderate reviews |

Customers (sign in at http://localhost:3000/login):

| Name | Email |
|---|---|
| Rahim Uddin | `customer@example.com` |
| Karim Hasan | `karim@example.com` |
| Nusrat Jahan | `nusrat@example.com` |
| Tanvir Ahmed | `tanvir@example.com` |
| Sadia Islam | `sadia@example.com` |
| Mehedi Hasan | `mehedi@example.com` |

The seeded customers already have a verified email. A customer who registers on the site gets a verification email in Mailpit and must click the link before paying or writing a review.

Coupons to try in the cart: `WELCOME20` (20% off over $50), `FLAT20` ($20 off over $100), `EXPIRED50` (expired, must be rejected).

## Run it locally

### Option A: Docker (one command)

Needs only [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose). You do not need PHP, Node, MySQL or Mailpit on your machine.

```bash
docker compose up --build
```

The first run takes a few minutes (it builds the images, creates the tables and loads the demo data). When the log shows `API ready`, open:

| What | URL |
|---|---|
| Storefront | http://localhost:3000 |
| Admin panel | http://localhost:3000/admin/login |
| API | http://127.0.0.1:8000/api/v1 |
| Mailpit inbox | http://127.0.0.1:8025 |

Logins are in the table below. Stop with `Ctrl+C`; `docker compose down` removes the containers and `docker compose down -v` also deletes the database.

Ports 3000, 8000, 8025, 1025 must be free (stop any local `php artisan serve` / `npm run dev` first).

To pay at checkout, copy `.env.example` to `.env` in the project root, fill in your Stripe **test** keys, and run `docker compose up --build` again (the publishable key is built into the frontend). Without keys the whole shop works except the payment step.

What runs: `db` (MySQL 8), `mailpit`, `backend` (Laravel, `backend/Dockerfile`) and `frontend` (Next.js production build, `frontend/Dockerfile`). The APP_KEY in `docker-compose.yml` is a demo key; use your own for anything real.

### Option B: run it directly on your machine

Requirements: PHP 8.3+, Composer, Node 20+, MySQL 8, Mailpit (for emails). With Laragon on Windows all of these are available.

#### 1. Backend

```bash
cd backend
composer install
cp .env.example .env            # then check the values below
php artisan key:generate
mysql -u root -e "CREATE DATABASE ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
php artisan migrate --seed      # tables + demo data
php artisan storage:link        # for uploaded product images
php artisan serve --port=8000
```

Environment variables (`backend/.env`):

| Variable | Default | Purpose |
|---|---|---|
| `APP_URL` | `http://127.0.0.1:8000` | Used to build uploaded image URLs |
| `FRONTEND_URL` | `http://localhost:3000` | Reset-password links, CORS |
| `CORS_ALLOWED_ORIGINS` | = `FRONTEND_URL` | Comma separated list of allowed browser origins |
| `DB_*` | MySQL on 127.0.0.1, db `ecommerce`, user `root` | Database |
| `MAIL_HOST` / `MAIL_PORT` | `127.0.0.1` / `1025` | Mailpit SMTP |
| `STRIPE_SECRET` | (empty) | Stripe **test** secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | (empty) | Stripe webhook signing secret (`whsec_...`) |
| `SHOP_SHIPPING_FLAT` | `5.00` | Flat delivery fee |
| `SHOP_PENDING_ORDER_HOURS` | `24` | Unpaid (pending) orders older than this are cancelled by `orders:expire-pending` |
| `SANCTUM_EXPIRATION` | `10080` | Minutes until an API token expires (7 days) |

Start Mailpit (Laragon: `E:\laragon\bin\mailpit\...\mailpit.exe`). Inbox: http://127.0.0.1:8025

The seeded pictures are saved with full URLs built from `APP_URL` when the seeders run. If you change `APP_URL` later, run `php artisan migrate:fresh --seed` again.

Optional: a scheduler cancels orders that were never paid. Run `php artisan schedule:work` (or add `php artisan schedule:run` to cron). It runs `orders:expire-pending` every hour.

#### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # set NEXT_PUBLIC_STRIPE_KEY (pk_test_...)
npm run dev                     # http://localhost:3000
```

| Variable (`frontend/.env.local`) | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api/v1` | Where the Laravel API runs |
| `NEXT_PUBLIC_STRIPE_KEY` | (empty) | Stripe **publishable** test key (`pk_test_...`). Without it the card form cannot load. |

### Stripe (test mode, no real charges)

1. Create a free Stripe account and copy the **test** keys from https://dashboard.stripe.com/test/apikeys.
2. Put `sk_test_...` in `backend/.env` (`STRIPE_SECRET`) and `pk_test_...` in `frontend/.env.local` (`NEXT_PUBLIC_STRIPE_KEY`).
3. Checkout needs both keys; without them a payment cannot be made.
4. Optional (the app also confirms payments itself, so this is only needed for the webhook path):
   `stripe listen --forward-to http://127.0.0.1:8000/api/v1/webhooks/stripe` and copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

Test cards (any future expiry date, any CVC):

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | Asks for 3-D Secure |

### Demo accounts (details are in "Quick start" above)

| Role | Email | Sign in at |
|---|---|---|
| Super Admin | superadmin@example.com | /admin/login |
| Admin | admin@example.com | /admin/login |
| Product Manager | product@example.com | /admin/login |
| Order Manager | orders@example.com | /admin/login |
| Support | support@example.com | /admin/login |
| Customer | customer@example.com (also karim@, nusrat@, tanvir@, sadia@, mehedi@) | /login |

Seeded data: 5 roles and 11 permissions, 4 dress styles + 12 clothing-type categories, 24 products (sizes Small to X-Large, 3 colors each, a star rating, photos from the design, 2 out of stock, 2 low stock), coupons `WELCOME20` (20% off over $50), `FLAT20` ($20 off over $100) and `EXPIRED50` (expired, for testing), and 14 orders in every status.
Reset everything with `php artisan migrate:fresh --seed`.

### Tests

```bash
cd backend
mysql -u root -e "CREATE DATABASE ecommerce_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
php artisan test          # 70 feature tests (Stripe is replaced by a fake gateway)
cd ../frontend && npm run lint && npx tsc --noEmit && npm run build
```

## Architecture notes

**Folders.** Laravel keeps controllers thin: a `FormRequest` validates, a service in `app/Services` does the work, a `Resource` shapes the JSON, `ApiResponse` wraps it. Admin code lives in `Services/Admin`, `Http/*/Admin`. Next.js: `app/(store)` is the storefront, `app/admin` the panel, `components/` holds UI, `lib/` the API client, types and helpers.

**Order totals and stock are secured on the server.**
- The browser only sends product ids and quantities. `CartPricingService` reads prices from the database and calculates everything in integer cents. `/checkout` accepts the shipping address only; fields such as `total` or `price` are ignored (covered by tests).
- Coupons are checked when applied, when the cart is priced, and again at checkout (active, dates, usage limit, minimum order). An expired coupon is rejected.
- Stock is **not** reserved at checkout. It is taken only when Stripe confirms payment (`OrderPaymentService`), inside a DB transaction that locks the order row and every product row (`SELECT ... FOR UPDATE`, in id order) and re-reads the stock. If anything sold out meanwhile, the whole order is cancelled, the payment is refunded and the customer gets a clear message. Stock never goes below zero.
- A payment is accepted only if Stripe says `succeeded` **and** the amount and currency match the order. Confirming twice (API + webhook) is safe: the locked order status makes it idempotent.
- Cancelling a paid order restores stock and the coupon use and refunds the payment.
- **Size and color.** The shopper picks a size and a color (validated against the product's own lists). They are saved on the cart line and copied to the order line. Stock is still kept per product, not per size: two cart lines of the same product (e.g. Small and Large) draw from the same stock, and the stock check and the decrement use their total.
- Order numbers look like `ORD-2026-000123`.
- Orders that are never paid are cancelled after 24 hours by the scheduled command `orders:expire-pending`. They never held stock, so nothing is restored; a late payment for such an order is refunded automatically.

**RBAC.** Spatie Permission stores roles and permissions. Its pivot tables are renamed in `config/permission.php` to the names in the brief: `role_user` (staff to roles) and `permission_role` (roles to permissions). Routes are protected with `can:<permission>` middleware, never by role name. `Gate::before` lets the Super Admin role through; the Super Admin role cannot be edited or deleted. Staff sign in through their own endpoint (`POST /api/v1/admin/auth/login`) and get a token with the `admin` ability; customers get the `customer` ability. A token of one kind is refused (403) on the other side's routes. Tokens expire after `SANCTUM_EXPIRATION` minutes. The admin UI hides menus and buttons using the permissions returned by `/admin/auth/me`, and a direct URL to a forbidden page shows a permission message. A Super Admin edits roles in a permission matrix page.

**2FA (TOTP).** `TotpService` is a small RFC 6238 implementation (HMAC-SHA1, 30 s, 6 digits; checked against the RFC test vector). The secret is stored encrypted and never returned by the API after setup. When a staff member with 2FA logs in, `POST /admin/auth/login` returns `two_factor_required` and a 5-minute challenge id, not a token. `POST /admin/auth/two-factor-challenge` exchanges challenge + code for the token. A challenge dies after 5 wrong codes, and a code can be used only once. Turning 2FA off needs the password and a current code. Recovery codes are not implemented: a locked-out staff member needs a Super Admin or a database reset of `two_factor_secret`.

**Security checklist.**
- bcrypt hashing (`BCRYPT_ROUNDS`), strong password policy, generic login error, login throttle (5 failures), rate limits on register, reset and checkout, general API limit of 120/min.
- Eloquent / bound parameters only; search wildcards are escaped. Validation in FormRequests (backend is the source of truth) and in the forms.
- XSS: HTML is stripped from names, addresses and descriptions on input, and React escapes everything on output (no `dangerouslySetInnerHTML`).
- IDOR: customer order queries include the owner, other people's orders return 404. Cart items are looked up only inside the caller's cart.
- API responses never include password hashes or Stripe secrets (explicit Resources, tested).
- Security headers on the API (middleware) and on Next.js (`next.config.ts`: CSP, frame, nosniff, referrer, permissions, HSTS). CORS allows only the frontend origin.
- CSRF: the API uses Bearer tokens and no cookies, so CSRF does not apply.
- Uploads: real image content, JPG/PNG/WebP, 2 MB, random file names.

**Nothing on the storefront is hard-coded.** Products, categories and prices come from the API, and so does all the other content: the announcement bar, hero text, hero picture and counters, brand strip, customer reviews, footer columns and social links, payment logos, newsletter title and the filter options (sizes, color swatches, price slider end). They live in the `site_settings` table (`GET /api/v1/site`) and are filled by `SiteSettingSeeder`. The hero counters are counted from the database (brands, active products, customers). Changing a row changes the site without a deploy. There is no admin screen for these settings yet.

**Email.** Order status changes (paid, processing, shipped, delivered, cancelled) email the customer through Mailpit. A mail failure is logged and never blocks the status change.

## Bonus items I did

- Feature tests for checkout, stock, order status, RBAC and the admin API (`php artisan test`).
- Guest cart that survives the browser and is merged into the customer's cart on login or registration.
- Dark mode toggle in the admin panel.
- Email verification: registration sends a signed link (Mailpit). Unverified customers can browse and use the cart, but cannot pay or review until they verify. The link goes to the API, marks the email verified and redirects to `/login?verified=1`. A mail server problem is logged and never blocks registration.
- Product reviews and ratings: only customers who bought the product (paid order, not cancelled) and have a verified email can review, one review per product (a second one replaces the first). Text has HTML removed and is shown escaped. The product's `rating` and `reviews_count` are recalculated on every change. Staff with `reviews.manage` can delete reviews in the admin panel.
- Activity logs: every staff create / update / delete on products, categories, coupons and roles, every order status change, staff sign-in and 2FA changes are written to `activity_logs` (who, what, IP, changed fields). The log is read-only through the API and shown on the admin "Activity log" page for staff with `activity.view`. Customer actions are not logged.
- Docker: `docker compose up --build` starts MySQL, Mailpit, the API and the storefront with demo data.
- Postman collection: `docs/SHOP.CO.postman_collection.json` (66 requests; login requests save the token into variables).
- 2FA (TOTP) for admin accounts: set up from the profile page with any authenticator app. The password step returns a short-lived challenge instead of a token; the token is issued only after a valid code (see below).

## Optional items I skipped (and why)

| Item | Reason |
|---|---|
| Live demo deployment | Needs hosting accounts. |
| Staff management page (create staff, assign roles) | The brief lists no such page. Roles are assigned in the seeder. |
| Admin screen for the storefront content (`site_settings`) | The brief lists no such page; the content is edited in the database or the seeder. |

## Known limits and what I would improve

- The storefront was matched to screenshots of the Figma frames (homepage, category with filters, cart, product page; desktop and mobile). Exact fonts are approximated (Archivo Black for headings, Inter for text), and the Product page "All Reviews" block was left out because there is no review feature.
- The Stripe path was tested against a fake gateway; run a real test payment with your own test keys before the review.
- Tokens are kept in `localStorage`. An httpOnly-cookie session behind a Next.js route handler would reduce XSS risk.
- CSP uses `'unsafe-inline'` for scripts (Next.js inline scripts); a nonce would tighten it.
- The seed photos (`backend/public/seed-images`) were cropped from screenshots of the Figma template, so they are small (about 270 px). Products that are not in the design reuse the photo of the same kind of garment, and the two hoodies still use a `picsum.photos` placeholder. Export the images from Figma at 2x and replace the files for a sharper result.
- Stock is per product, not per size/color variant. A full variant model (stock per size and color) would be the next step.
- Overselling is covered by tests that run one request after another plus the database row locks. A test that fires truly parallel requests is not included.
- The star ratings, the "Our happy customers" texts and the brand strip are template content stored in the database: the "Our happy customers" block on the home page is template content, while the product page reviews are real. The newsletter box validates the email but does not store it.
- Add frontend tests (Playwright) and a CI pipeline.
