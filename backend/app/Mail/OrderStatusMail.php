<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class OrderStatusMail extends Mailable
{
    /** Customer-facing wording for each status: [subject, headline, message]. */
    private const COPY = [
        Order::PAID => ['Payment received', 'We received your payment', 'Thank you! Your order is confirmed and we will start preparing it soon.'],
        Order::PROCESSING => ['Order is being prepared', 'We are preparing your order', 'Your items are being packed.'],
        Order::SHIPPED => ['Order shipped', 'Your order is on its way', 'Your order has been shipped and will reach you soon.'],
        Order::DELIVERED => ['Order delivered', 'Your order was delivered', 'We hope you enjoy your purchase!'],
        Order::CANCELLED => ['Order cancelled', 'Your order was cancelled', 'Your order has been cancelled. If you already paid, the money is being refunded to your card.'],
    ];

    public function __construct(public readonly Order $order, public readonly string $status) {}

    public static function supports(string $status): bool
    {
        return isset(self::COPY[$status]);
    }

    public function envelope(): Envelope
    {
        [$subject] = self::COPY[$this->status];

        return new Envelope(subject: "{$subject} - {$this->order->order_number}");
    }

    public function content(): Content
    {
        [, $headline, $message] = self::COPY[$this->status];

        return new Content(markdown: 'emails.order-status', with: [
            'headline' => $headline,
            'message' => $message,
            'order' => $this->order,
            'items' => $this->order->items,
            'orderUrl' => config('app.frontend_url').'/account/orders/'.$this->order->order_number,
        ]);
    }
}
