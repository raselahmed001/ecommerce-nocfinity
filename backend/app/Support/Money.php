<?php

namespace App\Support;

/**
 * Money is calculated in integer cents to avoid floating point errors,
 * and only turned back into "12.34" strings for the API response.
 */
final class Money
{
    public static function toCents(string|int|float $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    public static function format(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
