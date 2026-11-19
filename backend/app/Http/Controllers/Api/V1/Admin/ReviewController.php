<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CustomerIndexRequest;
use App\Http\Resources\Admin\AdminReviewResource;
use App\Models\Review;
use App\Services\ActivityLogger;
use App\Services\ReviewService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviews, private readonly ActivityLogger $log) {}

    public function index(CustomerIndexRequest $request): JsonResponse
    {
        $query = Review::with(['user:id,name,email', 'product:id,name,slug'])->latest('id');

        if ($q = trim((string) $request->validated('q'))) {
            $like = '%'.addcslashes($q, '%_\\').'%';
            $query->where(fn ($w) => $w->where('body', 'like', $like)->orWhere('title', 'like', $like)
                ->orWhereHas('product', fn ($p) => $p->where('name', 'like', $like))
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like)));
        }

        return ApiResponse::paginated($query->paginate((int) ($request->validated('per_page') ?? 15)), AdminReviewResource::class);
    }

    public function destroy(Review $review): JsonResponse
    {
        $this->log->log('review.deleted', "Deleted review #{$review->id} of product #{$review->product_id}", $review);
        $this->reviews->delete($review);

        return ApiResponse::success(null, 'Review deleted.');
    }
}
