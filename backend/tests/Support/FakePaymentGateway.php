<?php

namespace Tests\Support;

use App\Services\Payment\PaymentGateway;
use InvalidArgumentException;

/** In-memory stand-in for Stripe, so tests never touch the network. */
class FakePaymentGateway implements PaymentGateway
{
    /** @var array<string, array> */
    public array $intents = [];

    /** @var list<string> */
    public array $refunded = [];

    private int $counter = 0;

    public function createIntent(int $amountCents, string $currency, array $metadata, string $idempotencyKey): array
    {
        $id = 'pi_fake_'.(++$this->counter);

        return $this->intents[$id] = [
            'id' => $id,
            'client_secret' => $id.'_secret_test',
            'status' => 'requires_payment_method',
            'amount' => $amountCents,
            'currency' => $currency,
            'failure_message' => null,
        ];
    }

    public function retrieveIntent(string $intentId): array
    {
        return $this->intents[$intentId];
    }

    public function refund(string $intentId): void
    {
        $this->refunded[] = $intentId;
    }

    public function parseWebhook(string $payload, ?string $signature): array
    {
        if ($signature !== 'valid-signature') {
            throw new InvalidArgumentException('Invalid webhook signature.');
        }

        $data = json_decode($payload, true);

        return ['type' => $data['type'], 'intent' => $data['intent']];
    }

    // ---- helpers the tests use to simulate what the customer does at Stripe ----

    public function succeed(string $intentId): void
    {
        $this->intents[$intentId]['status'] = 'succeeded';
    }

    public function fail(string $intentId, string $message = 'Your card was declined.'): void
    {
        $this->intents[$intentId]['status'] = 'requires_payment_method';
        $this->intents[$intentId]['failure_message'] = $message;
    }

    public function lastIntentId(): string
    {
        return array_key_last($this->intents);
    }
}
