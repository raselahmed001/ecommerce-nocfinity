<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Product;
use App\Services\ReviewService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviews) {}

    private function product(string $slug): Product
    {
        return Product::where('slug', $slug)->where('is_active', true)->firstOrFail();
    }

    /** Public list. If a customer token is sent, also says whether they can review. */
    public function index(Request $request, string $slug): JsonResponse
    {
        $product = $this->product($slug);
        $paginator = $this->reviews->paginate($product, 10);
        $customer = $request->user('sanctum');
        $customer = $customer && ! $customer->is_staff && $customer->tokenCan('customer') ? $customer : null;

        $response = ApiResponse::paginated($paginator, ReviewResource::class)->getData(true);
        $response['summary'] = $this->reviews->summary($product);

        if ($customer) {
            $purchased = $this->reviews->hasPurchased($customer, $product);
            $mine = $this->reviews->mine($customer, $product);

            $response['viewer'] = [
                'has_purchased' => $purchased,
                'email_verified' => $customer->hasVerifiedEmail(),
                'can_review' => $purchased && $customer->hasVerifiedEmail(),
                'review' => $mine ? (new ReviewResource($mine))->resolve() : null,
            ];
        } else {
            $response['viewer'] = null;
        }

        return response()->json($response);
    }

    public function store(ReviewRequest $request, string $slug): JsonResponse
    {
        $review = $this->reviews->save($request->user(), $this->product($slug), $request->validated());

        return ApiResponse::success(new ReviewResource($review), 'Thank you for your review.', 201);
    }

    public function destroy(Request $request, string $slug): JsonResponse
    {
        $review = $this->reviews->mine($request->user(), $this->product($slug));
        abort_if(! $review, 404);
        $this->reviews->delete($review);

        return ApiResponse::success(null, 'Review deleted.');
    }
}
