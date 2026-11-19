<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ProductIndexRequest;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductResource;
use App\Services\ProductService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function __construct(private readonly ProductService $products) {}

    public function index(ProductIndexRequest $request): JsonResponse
    {
        return ApiResponse::paginated(
            $this->products->paginate($request->validated()),
            ProductResource::class,
        );
    }

    public function show(string $slug): JsonResponse
    {
        $product = $this->products->findActiveBySlug($slug);

        return ApiResponse::success([
            'product' => new ProductDetailResource($product),
            'related' => ProductResource::collection($this->products->related($product)),
        ]);
    }
}
