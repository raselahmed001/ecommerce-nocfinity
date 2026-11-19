<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Adds the standard browser security headers to every API response. */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->add([
            // Stop browsers from guessing a file type (blocks MIME sniffing attacks).
            'X-Content-Type-Options' => 'nosniff',
            // This API is never meant to be shown in a frame (clickjacking).
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'no-referrer',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
            // The API returns JSON only, so nothing may be loaded or framed from its responses.
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'",
            // Responses can hold personal data (carts, orders): do not let proxies or browsers cache them.
            'Cache-Control' => 'no-store, private',
        ]);

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
