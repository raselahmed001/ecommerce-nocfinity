<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Coupon;
use App\Support\Money;

/**
 * The only place that calculates cart money. Prices always come from the
 * products table, never from the request, so a customer cannot tamper with them.
 * Checkout uses this same service.
 */
class CartPricingService
{
    public function __construct(private readonly CouponService $coupons) {}

    /**
     * Expects $cart->items.product (and coupon) to be loaded.
     *
     * @return array{
     *   lines: list<array{item: \App\Models\CartItem, unit_cents: int, line_cents: int, issue: ?string}>,
     *   subtotal_cents: int, discount_cents: int, shipping_cents: int, total_cents: int,
     *   coupon: ?Coupon, coupon_error: ?string, has_issues: bool
     * }
     */
    public function calculate(Cart $cart): array
    {
        $lines = [];
        $subtotal = 0;
        $hasIssues = false;

        // Lines of the same product (other size / color) share one stock.
        $perProduct = $cart->items->groupBy('product_id')->map(fn ($rows) => $rows->sum('quantity'));

        foreach ($cart->items as $item) {
            $product = $item->product;
            $issue = $this->issueFor($product, $perProduct[$item->product_id]);

            $unit = $product ? Money::toCents($product->currentPrice()) : 0;
            $line = $unit * $item->quantity;

            // Products that are gone or inactive cannot be bought, so they add nothing.
            if ($product && ! $product->trashed() && $product->is_active) {
                $subtotal += $line;
            } else {
                $line = 0;
            }

            $hasIssues = $hasIssues || $issue !== null;
            $lines[] = ['item' => $item, 'unit_cents' => $unit, 'line_cents' => $line, 'issue' => $issue];
        }

        $coupon = $cart->coupon;
        $couponError = null;
        $discount = 0;

        if ($coupon) {
            $couponError = $this->coupons->validationError($coupon, $subtotal);
            $discount = $couponError ? 0 : $this->coupons->discountCents($coupon, $subtotal);
        }

        $shipping = $subtotal > 0 ? Money::toCents(config('shop.shipping_flat')) : 0;

        return [
            'lines' => $lines,
            'subtotal_cents' => $subtotal,
            'discount_cents' => $discount,
            'shipping_cents' => $shipping,
            'total_cents' => $subtotal - $discount + $shipping,
            'coupon' => $coupon,
            'coupon_error' => $couponError,
            'has_issues' => $hasIssues,
        ];
    }

    private function issueFor($product, int $quantity): ?string
    {
        if (! $product || $product->trashed() || ! $product->is_active) {
            return 'This product is no longer available.';
        }
        if ($product->stock < 1) {
            return 'Out of stock.';
        }
        if ($quantity > $product->stock) {
            return "Only {$product->stock} left in stock.";
        }

        return null;
    }
}
