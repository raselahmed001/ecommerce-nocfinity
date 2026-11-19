<?php

namespace App\Services;

use App\Models\Coupon;
use App\Support\Money;

class CouponService
{
    public function findByCode(string $code): ?Coupon
    {
        return Coupon::where('code', strtoupper(trim($code)))->first();
    }

    /**
     * Why this coupon cannot be used right now, or null when it is fine.
     * Checked when applying a coupon, again when pricing the cart, and again at checkout.
     */
    public function validationError(Coupon $coupon, int $subtotalCents): ?string
    {
        if (! $coupon->is_active) {
            return 'This coupon is not active.';
        }
        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            return 'This coupon is not valid yet.';
        }
        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            return 'This coupon has expired.';
        }
        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            return 'This coupon has reached its usage limit.';
        }
        if ($subtotalCents < Money::toCents($coupon->min_order_amount)) {
            return "A minimum order of {$coupon->min_order_amount} is required for this coupon.";
        }

        return null;
    }

    /** Discount in cents. Never more than the subtotal. */
    public function discountCents(Coupon $coupon, int $subtotalCents): int
    {
        $valueCents = Money::toCents($coupon->value);

        if ($coupon->type === 'percentage') {
            // value 10.00 => 1000 hundredths of a percent; round half up, integers only.
            $discount = intdiv($subtotalCents * $valueCents + 5000, 10000);
        } else {
            $discount = $valueCents;
        }

        return min($discount, $subtotalCents);
    }
}
