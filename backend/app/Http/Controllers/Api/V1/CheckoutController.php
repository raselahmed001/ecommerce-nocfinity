<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Checkout\CheckoutRequest;
use App\Http\Requests\Checkout\ConfirmPaymentRequest;
use App\Http\Resources\OrderDetailResource;
use App\Services\CheckoutService;
use App\Services\OrderPaymentService;
use App\Services\OrderService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CheckoutService $checkout,
        private readonly OrderPaymentService $payments,
        private readonly OrderService $orders,
    ) {}

    /** Step 1: create the pending order and the Stripe payment intent. */
    public function store(CheckoutRequest $request): JsonResponse
    {
        $result = $this->checkout->start($request->user(), $request->validated());

        return ApiResponse::success([
            'order_number' => $result['order']->order_number,
            'total' => $result['order']->total,
            // The browser needs only the client secret to confirm the card with Stripe.js.
            'client_secret' => $result['client_secret'],
        ], 'Order created. Complete the payment to place it.', 201);
    }

    /** Step 2: after Stripe.js confirms the card, the server checks the real payment status. */
    public function confirm(ConfirmPaymentRequest $request): JsonResponse
    {
        $order = $this->orders->findForUser($request->user(), $request->validated('order_number'));

        if (! $this->payments->confirm($order)) {
            return ApiResponse::error('The payment was not completed. Your order has not been placed.', 402);
        }

        $order = $this->orders->findForUser($request->user(), $order->order_number);

        return ApiResponse::success(new OrderDetailResource($order), 'Payment received. Thank you for your order!');
    }
}
