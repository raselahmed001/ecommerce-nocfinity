<?php

use App\Http\Controllers\Api\V1\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\V1\Admin\CouponController;
use App\Http\Controllers\Api\V1\Admin\CustomerController;
use App\Http\Controllers\Api\V1\Admin\DashboardController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\PermissionController;
use App\Http\Controllers\Api\V1\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\V1\Admin\ProfileController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Admin\TwoFactorController;
use App\Http\Controllers\Api\V1\Auth\AdminAuthController;
use App\Http\Controllers\Api\V1\Auth\CustomerAuthController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CartCouponController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\SiteController;
use App\Http\Controllers\Api\V1\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // ---- Public catalog (no login needed) ----
    Route::get('site', [SiteController::class, 'show']);
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/{slug}', [ProductController::class, 'show']);

    // ---- Cart: guests (X-Cart-Token header) and logged-in customers (Bearer token) ----
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'show']);
        Route::delete('/', [CartController::class, 'clear']);
        Route::post('items', [CartController::class, 'addItem']);
        Route::patch('items/{item}', [CartController::class, 'updateItem'])->whereNumber('item');
        Route::delete('items/{item}', [CartController::class, 'removeItem'])->whereNumber('item');
        Route::post('coupon', [CartCouponController::class, 'apply']);
        Route::delete('coupon', [CartCouponController::class, 'remove']);
    });

    // ---- Stripe calls this itself (verified by signature, so no login) ----
    Route::post('webhooks/stripe', [StripeWebhookController::class, 'handle']);

    // ---- Checkout and orders: logged-in customers only ----
    Route::middleware(['auth:sanctum', 'abilities:customer'])->group(function () {
        Route::post('checkout', [CheckoutController::class, 'store'])->middleware('throttle:10,1');
        Route::post('checkout/confirm', [CheckoutController::class, 'confirm'])->middleware('throttle:20,1');
        Route::get('orders', [OrderController::class, 'index']);
        Route::get('orders/{orderNumber}', [OrderController::class, 'show']);
    });

    // ---- Customer auth ----
    Route::prefix('auth')->group(function () {
        Route::post('register', [CustomerAuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('login', [CustomerAuthController::class, 'login']);
        Route::post('forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:5,1');
        Route::post('reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');

        Route::middleware(['auth:sanctum', 'abilities:customer'])->group(function () {
            Route::post('logout', [CustomerAuthController::class, 'logout']);
            Route::get('me', [CustomerAuthController::class, 'me']);
        });
    });

    // ---- Admin / staff auth (separate login and separate token ability) ----
    Route::prefix('admin/auth')->group(function () {
        Route::post('login', [AdminAuthController::class, 'login']);
        Route::post('two-factor-challenge', [AdminAuthController::class, 'twoFactorChallenge'])->middleware('throttle:10,1');

        Route::middleware(['auth:sanctum', 'abilities:admin'])->group(function () {
            Route::post('logout', [AdminAuthController::class, 'logout']);
            Route::get('me', [AdminAuthController::class, 'me']);
        });
    });

    // ---- Admin panel API: admin token + a specific permission per route group ----
    // `can:<permission>` is checked against the user's effective permissions
    // (role permissions via Spatie). Super Admin passes through Gate::before.
    Route::prefix('admin')->middleware(['auth:sanctum', 'abilities:admin'])->group(function () {

        // Any signed-in staff member can see and edit their own profile.
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);

        // Two-factor authentication (TOTP) for the signed-in staff member.
        Route::post('two-factor/setup', [TwoFactorController::class, 'setup'])->middleware('throttle:10,1');
        Route::post('two-factor/confirm', [TwoFactorController::class, 'confirm'])->middleware('throttle:10,1');
        Route::post('two-factor/disable', [TwoFactorController::class, 'disable'])->middleware('throttle:10,1');

        Route::get('dashboard', DashboardController::class)->middleware('can:reports.view');

        // Products
        Route::get('products', [AdminProductController::class, 'index'])->middleware('can:products.view');
        Route::get('products/{product}', [AdminProductController::class, 'show'])->middleware('can:products.view');
        Route::post('products', [AdminProductController::class, 'store'])->middleware('can:products.create');
        Route::put('products/{product}', [AdminProductController::class, 'update'])->middleware('can:products.edit');
        Route::post('products/{product}/images', [AdminProductController::class, 'addImages'])->middleware('can:products.edit');
        Route::patch('products/{product}/images/{image}/primary', [AdminProductController::class, 'setPrimaryImage'])->middleware('can:products.edit');
        Route::delete('products/{product}/images/{image}', [AdminProductController::class, 'deleteImage'])->middleware('can:products.edit');
        Route::delete('products/{product}', [AdminProductController::class, 'destroy'])->middleware('can:products.delete');

        // Categories (the product manager also needs to read them to fill the product form)
        Route::get('categories', [AdminCategoryController::class, 'index'])->middleware('can:products.view');
        Route::middleware('can:categories.manage')->group(function () {
            Route::post('categories', [AdminCategoryController::class, 'store']);
            Route::put('categories/{category}', [AdminCategoryController::class, 'update']);
            Route::delete('categories/{category}', [AdminCategoryController::class, 'destroy']);
        });

        // Orders
        Route::get('orders', [AdminOrderController::class, 'index'])->middleware('can:orders.view');
        Route::get('orders/{order}', [AdminOrderController::class, 'show'])->middleware('can:orders.view');
        Route::patch('orders/{order}/status', [AdminOrderController::class, 'updateStatus'])->middleware('can:orders.update_status');

        // Coupons
        Route::middleware('can:coupons.manage')->group(function () {
            Route::apiResource('coupons', CouponController::class);
        });

        // Customers
        Route::middleware('can:customers.view')->group(function () {
            Route::get('customers', [CustomerController::class, 'index']);
            Route::get('customers/{customer}', [CustomerController::class, 'show'])->whereNumber('customer');
            Route::get('customers/{customer}/orders', [CustomerController::class, 'orders'])->whereNumber('customer');
        });

        // Roles and permissions matrix (Super Admin only by default)
        Route::middleware('can:roles.manage')->group(function () {
            Route::get('permissions', [PermissionController::class, 'index']);
            Route::apiResource('roles', RoleController::class);
        });
    });
});
