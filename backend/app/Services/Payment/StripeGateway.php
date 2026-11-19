<?php

namespace App\Services\Payment;

use InvalidArgumentException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\PaymentIntent;
use Stripe\StripeClient;
use Stripe\Webhook;
use UnexpectedValueException;

class StripeGateway implements PaymentGateway
{
    private ?StripeClient $client = null;

    public function createIntent(int $amountCents, string $currency, array $metadata, string $idempotencyKey): array
    {
        $intent = $this->client()->paymentIntents->create([
            'amount' => $amountCents,
            'currency' => $currency,
            'payment_method_types' => ['card'], // card only
            'metadata' => $metadata,
        ], ['idempotency_key' => $idempotencyKey]);

        return $this->normalize($intent);
    }

    public function retrieveIntent(string $intentId): array
    {
        return $this->normalize($this->client()->paymentIntents->retrieve($intentId));
    }

    public function refund(string $intentId): void
    {
        $this->client()->refunds->create(['payment_intent' => $intentId]);
    }

    public function parseWebhook(string $payload, ?string $signature): array
    {
        $secret = config('services.stripe.webhook_secret');

        if (! $secret || ! $signature) {
            throw new InvalidArgumentException('Webhook signature is missing.');
        }

        try {
            $event = Webhook::constructEvent($payload, $signature, $secret);
        } catch (SignatureVerificationException|UnexpectedValueException $e) {
            throw new InvalidArgumentException('Invalid webhook signature.', 0, $e);
        }

        $object = $event->data->object;

        return [
            'type' => $event->type,
            'intent' => $object instanceof PaymentIntent ? $this->normalize($object) : ['id' => $object->id ?? null],
        ];
    }

    private function client(): StripeClient
    {
        return $this->client ??= new StripeClient((string) config('services.stripe.secret'));
    }

    private function normalize(PaymentIntent $intent): array
    {
        return [
            'id' => $intent->id,
            'client_secret' => $intent->client_secret,
            'status' => $intent->status,
            'amount' => (int) $intent->amount,
            'currency' => $intent->currency,
            'failure_message' => $intent->last_payment_error?->message,
        ];
    }
}
