# API reference

Base URL: `http://127.0.0.1:8000/api/v1`  ·  JSON only  ·  Auth: `Authorization: Bearer <token>` (Laravel Sanctum)

## Response format

```jsonc
// success
{ "success": true, "message": "OK", "data": { } }

// list (paginated)
{ "success": true, "message": "OK", "data": [ ],
  "meta": { "current_page": 1, "last_page": 2, "per_page": 12, "total": 24, "from": 1, "to": 12 } }

// error
{ "success": false, "message": "The given data was invalid.", "errors": { "field": ["message"] } }
```

| Status | Meaning |
|---|---|
| 200 / 201 | OK / created |
| 401 | Not signed in, token expired, or wrong credentials (generic message) |
| 402 | Payment was not completed |
| 403 | Signed in but not allowed (missing permission or wrong token type) |
| 404 | Not found, **also used for other people's orders** (no information leak) |
| 409 | Conflict (sold out while paying, deleting a role/category that is in use) |
| 422 | Validation error (`errors` lists the fields) |
| 429 | Rate limited (`Retry-After` header) |

Money values are strings with two decimals (`"449.00"`). Every total is calculated on the server.

## Token types

| Login | Token ability | Works on |
|---|---|---|
| `POST /auth/login` (customer) | `customer` | `/auth/*`, `/checkout`, `/orders`, cart |
| `POST /admin/auth/login` (staff) | `admin` | `/admin/*` |

A customer token on an admin route (or the reverse) returns **403**.

## Public catalog

| Method | Path | Notes |
|---|---|---|
| GET | `/site` | Storefront content: `name`, `announcement`, `hero` (text, image URL, counted `stats`), `brands`, `testimonials`, `newsletter`, `footer`, `payments`, `filters` (`sizes`, `colors` with hex, `price_max`) |
| GET | `/categories` | Two-level tree |
| GET | `/products` | `q`, `category` (slug, a parent includes its children), `min_price`, `max_price`, `size`, `color`, `on_sale`, `featured`, `sort` (`newest`, `popular`, `price_asc`, `price_desc`), `per_page` (1-48), `page`. Products carry `sizes`, `colors` and `rating`. |
| GET | `/products/{slug}` | `{ product, related }` (product has `images` and `description`) |

## Cart (guest or customer)

Guests send the token they were given (`data.guest_token`) in the `X-Cart-Token` header. Customers send their Bearer token. On login or registration the guest cart is merged into the customer's cart when `X-Cart-Token` is sent.

| Method | Path | Body |
|---|---|---|
| GET | `/cart` | |
| POST | `/cart/items` | `product_id`, `quantity`, `size`, `color` (required, and must be one of the product's own, when the product has sizes / colors; a `price` field is ignored) |
| PATCH | `/cart/items/{id}` | `quantity` |
| DELETE | `/cart/items/{id}` | |
| DELETE | `/cart` | clears the cart |
| POST | `/cart/coupon` | `code` |
| DELETE | `/cart/coupon` | |

Cart response: `items[]` (`size`, `color`, `unit_price`, `line_total`, `issue`), `subtotal`, `discount`, `shipping`, `total`, `coupon`, `has_issues`.

## Customer auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | `name`, `email`, `phone?`, `password`, `password_confirmation` |
| POST | `/auth/login` | 5 failed attempts per email+IP lock it for 60 seconds (429) |
| POST | `/auth/logout`, GET `/auth/me` | customer token |
| POST | `/auth/forgot-password` | same reply for unknown emails; sends a Mailpit email |
| POST | `/auth/reset-password` | `token`, `email`, `password`, `password_confirmation` |

Password policy: 8+ characters, upper and lower case, a number and a symbol.

## Checkout and orders (customer token)

| Method | Path | Notes |
|---|---|---|
| POST | `/checkout` | Body is the shipping address only (`name`, `phone`, `address_line1`, `address_line2?`, `city`, `state?`, `postal_code`, `country`). Creates a **pending** order and a Stripe PaymentIntent. Returns `order_number`, `total`, `client_secret`. |
| POST | `/checkout/confirm` | `order_number`. Asks Stripe for the real payment status, then marks the order paid and takes stock. 402 if not paid, 409 if an item sold out (payment is refunded). |
| GET | `/orders` | Own orders, paginated |
| GET | `/orders/{order_number}` | 404 for anyone else's order |
| POST | `/webhooks/stripe` | Called by Stripe. Verified by signature. |

## Admin (staff token + permission)

| Permission | Endpoints |
|---|---|
| (any staff) | `GET/PUT /admin/profile`, `GET /admin/auth/me`, `POST /admin/auth/logout` |
| `reports.view` | `GET /admin/dashboard` |
| `products.view` | `GET /admin/products` (`q`, `category_id`, `status`, `stock`), `GET /admin/products/{id}`, `GET /admin/categories` (the whole tree; add `page` / `per_page` to get top-level categories page by page) |
| `products.create` | `POST /admin/products` (multipart; `images[]`). Also takes `sizes[]`, `colors[]` and `rating` (0-5) |
| `products.edit` | `PUT /admin/products/{id}`, `POST /admin/products/{id}/images`, `PATCH /admin/products/{id}/images/{image}/primary`, `DELETE /admin/products/{id}/images/{image}` |
| `products.delete` | `DELETE /admin/products/{id}` (soft delete) |
| `categories.manage` | `POST/PUT/DELETE /admin/categories` |
| `orders.view` | `GET /admin/orders` (`status`, `q`), `GET /admin/orders/{id}` |
| `orders.update_status` | `PATCH /admin/orders/{id}/status` (`status`) |
| `coupons.manage` | `GET/POST/PUT/DELETE /admin/coupons` |
| `customers.view` | `GET /admin/customers`, `GET /admin/customers/{id}`, `GET /admin/customers/{id}/orders` (paginated order history) |
| `roles.manage` | `GET /admin/permissions`, `GET/POST/PUT/DELETE /admin/roles` |

Order status changes allowed for staff: `paid → processing → shipped → delivered`, and `pending/paid/processing → cancelled`. `paid` is only ever set by a real payment.
