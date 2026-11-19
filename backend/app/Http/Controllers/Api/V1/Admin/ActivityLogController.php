<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ActivityLogIndexRequest;
use App\Http\Resources\Admin\ActivityLogResource;
use App\Models\ActivityLog;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

/** Read-only: the audit trail can be viewed but never edited through the API. */
class ActivityLogController extends Controller
{
    public function index(ActivityLogIndexRequest $request): JsonResponse
    {
        $query = ActivityLog::with('user:id,name')->orderByDesc('id');

        if ($action = $request->validated('action')) {
            $query->where('action', 'like', addcslashes($action, '%_\\').'%'); // e.g. "product" matches product.*
        }

        if ($q = trim((string) $request->validated('q'))) {
            $like = '%'.addcslashes($q, '%_\\').'%';
            $query->where(fn ($w) => $w->where('description', 'like', $like)->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like)));
        }

        return ApiResponse::paginated($query->paginate((int) ($request->validated('per_page') ?? 20)), ActivityLogResource::class);
    }
}
