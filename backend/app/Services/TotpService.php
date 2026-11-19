<?php

namespace App\Services;

/**
 * Time-based one-time passwords (RFC 6238, as used by Google Authenticator):
 * HMAC-SHA1, 30 second steps, 6 digits. Small enough to read in full, so no package is needed.
 */
class TotpService
{
    private const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    private const STEP = 30;
    private const DIGITS = 6;

    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20)); // 160 bits
    }

    /** The URI an authenticator app reads from the QR code. */
    public function uri(string $secret, string $account, string $issuer): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d',
            rawurlencode($issuer), rawurlencode($account), $secret, rawurlencode($issuer), self::DIGITS, self::STEP,
        );
    }

    /**
     * Accepts the current step and one step either side (clock drift).
     * Returns the matched time step, or null. The caller stores it to refuse a replay.
     */
    public function verify(string $secret, string $code, ?int $now = null): ?int
    {
        $code = preg_replace('/\s+/', '', $code);

        if (! preg_match('/^\d{6}$/', $code)) {
            return null;
        }

        $current = intdiv($now ?? time(), self::STEP);

        for ($step = $current - 1; $step <= $current + 1; $step++) {
            if (hash_equals($this->codeAt($secret, $step), $code)) {
                return $step;
            }
        }

        return null;
    }

    public function codeAt(string $secret, int $step): string
    {
        $hash = hash_hmac('sha1', pack('J', $step), $this->base32Decode($secret), true);
        $offset = ord($hash[19]) & 0x0F;
        $binary = (unpack('N', substr($hash, $offset, 4))[1]) & 0x7FFFFFFF;

        return str_pad((string) ($binary % (10 ** self::DIGITS)), self::DIGITS, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::BASE32[bindec(str_pad($chunk, 5, '0'))];
        }

        return $out;
    }

    private function base32Decode(string $text): string
    {
        $bits = '';
        foreach (str_split(strtoupper($text)) as $char) {
            $bits .= str_pad(decbin(strpos(self::BASE32, $char)), 5, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }

        return $out;
    }
}
