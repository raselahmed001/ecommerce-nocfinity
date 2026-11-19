<?php

return [
    // Currency sent to Stripe and shown on orders.
    'currency' => env('SHOP_CURRENCY', 'usd'),

    // Flat shipping fee added to every non-empty order.
    'shipping_flat' => env('SHOP_SHIPPING_FLAT', 5.00),

    // A pending order that is still unpaid after this many hours is cancelled by `orders:expire-pending`.
    'pending_order_hours' => (int) env('SHOP_PENDING_ORDER_HOURS', 24),

    // Highest quantity of one product a customer can put in the cart.
    'max_item_quantity' => 20,
];
