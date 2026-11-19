<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const PENDING = 'pending';
    public const PAID = 'paid';
    public const PROCESSING = 'processing';
    public const SHIPPED = 'shipped';
    public const DELIVERED = 'delivered';
    public const CANCELLED = 'cancelled';

    public const STATUSES = [
        self::PENDING, self::PAID, self::PROCESSING,
        self::SHIPPED, self::DELIVERED, self::CANCELLED,
    ];

    // Totals and status are set by backend code only, never from request input.
    protected $fillable = [
        'order_number', 'user_id', 'status', 'subtotal', 'discount_total', 'shipping_total', 'total',
        'coupon_id', 'coupon_code',
        'shipping_name', 'shipping_phone', 'shipping_address_line1', 'shipping_address_line2',
        'shipping_city', 'shipping_state', 'shipping_postal_code', 'shipping_country',
        'paid_at', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'shipping_total' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    /** ORD-2026-000123 style number built from the year and the row id. */
    public static function makeNumber(int $id, ?int $year = null): string
    {
        return sprintf('ORD-%d-%06d', $year ?? now()->year, $id);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }
}
