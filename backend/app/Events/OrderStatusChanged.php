<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;

/** Fired after an order moves from one status to another (a listener emails the customer). */
class OrderStatusChanged
{
    use Dispatchable;

    public function __construct(
        public readonly Order $order,
        public readonly string $from,
        public readonly string $to,
    ) {}
}
