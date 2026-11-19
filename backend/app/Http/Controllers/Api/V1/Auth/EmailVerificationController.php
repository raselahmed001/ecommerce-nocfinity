<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * The link in the email. The `signed` middleware rejects a changed or expired link;
     * the hash proves it was made for this email. Then the browser is sent to the storefront.
     */
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::where('is_staff', false)->find($id);
        $frontend = rtrim(config('app.frontend_url'), '/');

        if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return redirect()->away($frontend.'/login?verified=invalid');
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return redirect()->away($frontend.'/login?verified=1');
    }

    public function resend(Request $request, AuthService $auth): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return ApiResponse::success(null, 'Your email is already verified.');
        }

        $auth->sendVerificationEmail($request->user());

        return ApiResponse::success(null, 'Verification email sent. Please check your inbox.');
    }
}
