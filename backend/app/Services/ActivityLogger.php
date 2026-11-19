<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Writes one row to activity_logs for something a staff member did.
 * Nothing is written for customers, seeders or console commands.
 */
class ActivityLogger
{
    public function log(string $action, string $description, ?Model $subject = null, array $properties = [], ?User $actor = null): void
    {
        $actor ??= request()->user();

        if (! $actor instanceof User || ! $actor->is_staff) {
            return;
        }

        ActivityLog::create([
            'user_id' => $actor->id,
            'action' => $action,
            'description' => Str::limit($description, 250, ''),
            'subject_type' => $subject ? Str::snake(class_basename($subject)) : null,
            'subject_id' => $subject?->getKey(),
            'properties' => $properties ?: null,
            'ip_address' => request()->ip(),
        ]);
    }
}
