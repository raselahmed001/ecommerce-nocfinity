<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryIndexRequest;
use App\Http\Requests\Admin\CategoryRequest;
use App\Http\Resources\Admin\AdminCategoryResource;
use App\Models\Category;
use App\Services\Admin\AdminCategoryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function __construct(private readonly AdminCategoryService $categories) {}

    public function index(CategoryIndexRequest $request): JsonResponse
    {
        // The Categories page asks for a page. Dropdowns send neither parameter and get every category.
        if ($request->has('page') || $request->has('per_page')) {
            return ApiResponse::paginated(
                $this->categories->paginateTree((int) ($request->validated('per_page') ?? 10)),
                AdminCategoryResource::class
            );
        }

        return ApiResponse::success(AdminCategoryResource::collection($this->categories->tree()));
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        return ApiResponse::success(
            new AdminCategoryResource($this->categories->create($request->validated())),
            'Category created.',
            201
        );
    }

    public function update(CategoryRequest $request, Category $category): JsonResponse
    {
        return ApiResponse::success(
            new AdminCategoryResource($this->categories->update($category, $request->validated())),
            'Category updated.'
        );
    }

    public function destroy(Category $category): JsonResponse
    {
        $this->categories->delete($category);

        return ApiResponse::success(null, 'Category deleted.');
    }
}
