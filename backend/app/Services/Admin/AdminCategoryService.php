<?php

namespace App\Services\Admin;

use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AdminCategoryService
{
    /** All top-level categories with their children (including inactive), plus product counts. */
    public function tree(): Collection
    {
        return $this->treeQuery()->get();
    }

    /** The same tree, one page of top-level categories at a time (their children come along). */
    public function paginateTree(int $perPage = 10): LengthAwarePaginator
    {
        return $this->treeQuery()->paginate($perPage);
    }

    private function treeQuery(): Builder
    {
        return Category::query()
            ->whereNull('parent_id')
            ->with(['children' => fn ($q) => $q->withCount('products')])
            ->withCount('products')
            ->orderBy('sort_order');
    }

    /** @param  array<string, mixed>  $data */
    public function create(array $data): Category
    {
        $this->assertValidParent($data['parent_id'] ?? null, null);

        $data['slug'] = $this->uniqueSlug($data['name']);

        return Category::create($data)->loadCount('products');
    }

    /** @param  array<string, mixed>  $data */
    public function update(Category $category, array $data): Category
    {
        $this->assertValidParent($data['parent_id'] ?? null, $category);

        $category->update($data);

        return $category->loadCount('products');
    }

    public function delete(Category $category): void
    {
        if ($category->children()->exists()) {
            throw new ConflictHttpException('Delete or move the sub-categories first.');
        }
        if ($category->products()->exists()) {
            throw new ConflictHttpException('This category still has products. Move them first.');
        }

        $category->delete();
    }

    /** Keeps the tree at two levels and stops a category from becoming its own ancestor. */
    private function assertValidParent(?int $parentId, ?Category $category): void
    {
        if ($parentId === null) {
            return;
        }

        $parent = Category::find($parentId);

        if (! $parent || $parent->parent_id !== null) {
            throw ValidationException::withMessages(['parent_id' => ['Choose a top-level category as the parent.']]);
        }
        if ($category && $category->id === $parent->id) {
            throw ValidationException::withMessages(['parent_id' => ['A category cannot be its own parent.']]);
        }
        if ($category && $category->children()->exists()) {
            throw ValidationException::withMessages(['parent_id' => ['A category with sub-categories must stay top-level.']]);
        }
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'category';
        $slug = $base;

        for ($i = 2; Category::where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }
}
