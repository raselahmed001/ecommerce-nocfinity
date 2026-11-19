<x-mail::message>
# {{ $headline }}

Hi {{ $order->shipping_name }},

{{ $message }}

**Order number:** {{ $order->order_number }}

<x-mail::table>
| Item | Qty | Price |
| :--- | :-: | ----: |
@foreach ($items as $item)
| {{ $item->product_name }} | {{ $item->quantity }} | {{ $item->line_total }} |
@endforeach
| **Total** | | **{{ $order->total }}** |
</x-mail::table>

<x-mail::button :url="$orderUrl">
View your order
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
