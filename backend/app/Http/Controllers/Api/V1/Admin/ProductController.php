<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductImagesRequest;
use App\Http\Requests\Admin\ProductIndexRequest;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\Admin\AdminProductResource;
use App\Models\Product;
use App\Services\Admin\AdminProductService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function __construct(private readonly AdminProductService $products) {}

    public function index(ProductIndexRequest $request): JsonResponse
    {
        return ApiResponse::paginated($this->products->paginate($request->validated()), AdminProductResource::class);
    }

    public function show(Product $product): JsonResponse
    {
        return ApiResponse::success(new AdminProductResource($product->load(['category:id,name,slug', 'images'])));
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $data = $request->safe()->except('images');
        $product = $this->products->create($data, $request->file('images', []));

        return ApiResponse::success(new AdminProductResource($product), 'Product created.', 201);
    }

    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        $product = $this->products->update($product, $request->safe()->except('images'));

        return ApiResponse::success(new AdminProductResource($product), 'Product updated.');
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->products->delete($product);

        return ApiResponse::success(null, 'Product deleted.');
    }

    public function addImages(ProductImagesRequest $request, Product $product): JsonResponse
    {
        $product = $this->products->addImages($product, $request->file('images'));

        return ApiResponse::success(new AdminProductResource($product), 'Images uploaded.', 201);
    }

    public function deleteImage(Product $product, int $image): JsonResponse
    {
        return ApiResponse::success(
            new AdminProductResource($this->products->deleteImage($product, $image)),
            'Image deleted.'
        );
    }

    public function setPrimaryImage(Product $product, int $image): JsonResponse
    {
        return ApiResponse::success(
            new AdminProductResource($this->products->setPrimaryImage($product, $image)),
            'Primary image updated.'
        );
    }
}
