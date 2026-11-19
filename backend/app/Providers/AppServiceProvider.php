<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Payment\PaymentGateway;
use App\Services\Payment\StripeGateway;
use App\Services\RoleService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Real payments go through Stripe; tests swap this for a fake.
        $this->app->bind(PaymentGateway::class, StripeGateway::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Throw an exception on lazy loading (N+1 queries) outside production,
        // so missing eager loads are caught during development.
        Model::preventLazyLoading(! $this->app->isProduction());

        // Strong password policy used everywhere via Password::defaults().
        Password::defaults(fn () => Password::min(8)->letters()->mixedCase()->numbers()->symbols());

        // Super Admin passes every permission check. Returning null for everyone
        // else lets the normal role/permission check decide.
        Gate::before(fn (User $user) => $user->hasRole(RoleService::SUPER_ADMIN) ? true : null);

        // General limit for every API call: per logged-in user, or per IP address for guests.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));

        // Password reset emails link to the Next.js page, not to the API.
        ResetPassword::createUrlUsing(function ($user, string $token) {
            return config('app.frontend_url').'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ]);
        });
    }
}
