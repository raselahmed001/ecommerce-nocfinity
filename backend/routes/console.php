<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Close orders that were never paid (run `php artisan schedule:work` or a cron entry for schedule:run).
Schedule::command('orders:expire-pending')->hourly();
