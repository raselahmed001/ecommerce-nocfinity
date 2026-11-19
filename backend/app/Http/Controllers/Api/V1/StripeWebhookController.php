<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\OrderPaymentService;
use App\Services\Payment\PaymentGateway;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/** Stripe calls this endpoint itself. The signature proves the call is really from Stripe. */
class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly OrderPaymentService $payments,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        try {
            $event = $this->gateway->parseWebhook($request->getContent(), $request->header('Stripe-Signature'));
        } catch (InvalidArgumentException) {
            return ApiResponse::error('Invalid webhook signature.', 400);
        }

        try {
            match ($event['type']) {
                'payment_intent.succeeded' => $this->payments->handleSucceeded($event['intent']),
                'payment_intent.payment_failed' => $this->payments->handleFailed($event['intent']),
                default => null, // other events are ignored
            };
        } catch (ConflictHttpException) {
            // Sold out: the order was cancelled and refunded. Stripe must not retry.
        }

        return ApiResponse::success(null, 'Webhook handled.');
    }
}
