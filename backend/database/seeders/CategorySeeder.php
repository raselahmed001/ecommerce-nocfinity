<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Two-level tree. The parents are the "dress styles" of the design (Casual, Formal, Party, Gym),
     * the children are the clothing types shown in the filters.
     */
    private const TREE = [
        'Casual' => ['T-shirts', 'Shorts', 'Shirts', 'Hoodie', 'Jeans'],
        'Formal' => ['Shirts', 'Jeans'],
        'Party' => ['T-shirts', 'Shirts'],
        'Gym' => ['T-shirts', 'Shorts', 'Hoodie'],
    ];

    public function run(): void
    {
        $order = 0;

        foreach (self::TREE as $parentName => $children) {
            $parentSlug = Str::slug($parentName);

            $parent = Category::updateOrCreate(
                ['slug' => $parentSlug],
                [
                    'name' => $parentName,
                    'parent_id' => null,
                    'sort_order' => $order++,
                    'is_active' => true,
                    // Picture of the "Browse by dress style" tile (from the Figma template).
                    'image' => rtrim(config('app.url'), '/')."/seed-images/style-{$parentSlug}.jpg",
                ],
            );

            foreach ($children as $i => $childName) {
                Category::updateOrCreate(
                    ['slug' => $parentSlug.'-'.Str::slug($childName)],
                    ['name' => $childName, 'parent_id' => $parent->id, 'sort_order' => $i, 'is_active' => true],
                );
            }
        }
    }
}
