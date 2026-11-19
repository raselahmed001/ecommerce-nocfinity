<?php

namespace App\Models\Concerns;

use App\Services\ActivityLogger;
use Illuminate\Support\Str;

/**
 * Add to a model to log create / update / delete done by a signed-in staff member.
 * Only changed fields and short values are stored (never long text or secrets).
 */
trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        $logger = fn () => app(ActivityLogger::class);

        static::created(fn ($model) => $logger()->log($model->activityKey().'.created', "Created {$model->activityLabel()}", $model));

        static::updated(function ($model) use ($logger) {
            $changes = collect($model->getChanges())->except(['updated_at', 'password', 'two_factor_secret']);

            if ($changes->isEmpty()) {
                return;
            }

            $logger()->log(
                $model->activityKey().'.updated',
                "Updated {$model->activityLabel()}",
                $model,
                ['changed' => $changes->map(fn ($v) => is_string($v) ? Str::limit($v, 80) : $v)->all()],
            );
        });

        static::deleted(fn ($model) => $logger()->log($model->activityKey().'.deleted', "Deleted {$model->activityLabel()}", $model));
    }

    public function activityKey(): string
    {
        return Str::snake(class_basename($this));
    }

    public function activityLabel(): string
    {
        return $this->activityKey().' "'.($this->name ?? $this->code ?? $this->getKey()).'"';
    }
}
