<?php

namespace App\Services\Payment;

/**
 * What the shop needs from a payment provider. Stripe is the real
 * implementation; tests use a fake one so they never call the network.
 *
 * An "intent" is always returned as:
 *   ['id' => string, 'client_secret' => ?string, 'status' => string,
 *    'amount' => int (cents), 'currency' => string, 'failure_message' => ?string]
 */
interface PaymentGateway
{
    public function createIntent(int $amountCents, string $currency, array $metadata, string $idempotencyKey): array;

    public function retrieveIntent(string $intentId): array;

    public function refund(string $intentId): void;

    /**
     * Verify a webhook signature and return ['type' => string, 'intent' => array].
     *
     * @throws \InvalidArgumentException when the signature is not valid
     */
    public function parseWebhook(string $payload, ?string $signature): array;
}
