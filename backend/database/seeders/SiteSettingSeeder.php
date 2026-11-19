<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

/** Storefront content of the Figma template. Change a row to change the site; no code is needed. */
class SiteSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'name' => 'SHOP.CO',

            'announcement' => [
                'text' => 'Sign up and get 20% off to your first order.',
                'link_label' => 'Sign Up Now',
                'link_url' => '/register',
            ],

            'hero' => [
                'title' => 'Find clothes that matches your style',
                'text' => 'Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.',
                'button_label' => 'Shop Now',
                'button_url' => '/products',
                'image' => 'seed-images/hero.jpg',
                'image_alt' => 'Models wearing the new collection',
                // The numbers are counted from the database (see SiteContentService).
                'stats' => [
                    ['source' => 'brands', 'label' => 'International Brands'],
                    ['source' => 'products', 'label' => 'High-Quality Products'],
                    ['source' => 'customers', 'label' => 'Happy Customers'],
                ],
            ],

            'brands' => [
                ['name' => 'VERSACE', 'font' => 'serif', 'weight' => 500, 'spacing' => '-0.02em'],
                ['name' => 'ZARA', 'font' => 'serif', 'weight' => 300, 'spacing' => '0.15em'],
                ['name' => 'GUCCI', 'font' => 'serif', 'weight' => 400, 'spacing' => '0.12em'],
                ['name' => 'PRADA', 'font' => 'serif', 'weight' => 900, 'spacing' => '0.03em'],
                ['name' => 'Calvin Klein', 'font' => 'sans', 'weight' => 300, 'spacing' => '-0.02em'],
            ],

            'testimonials' => [
                ['name' => 'Sarah M.', 'rating' => 5, 'text' => "I'm blown away by the quality and style of the clothes I received from Shop.co. From casual wear to elegant dresses, every piece I've bought has exceeded my expectations."],
                ['name' => 'Alex K.', 'rating' => 5, 'text' => 'Finding clothes that align with my personal style used to be a challenge until I discovered Shop.co. The range of options they offer is truly remarkable, catering to a variety of tastes and occasions.'],
                ['name' => 'James L.', 'rating' => 5, 'text' => "As someone who's always on the lookout for unique fashion pieces, I'm thrilled to have stumbled upon Shop.co. The selection of clothes is not only diverse but also on-point with the latest trends."],
                ['name' => 'Moosa R.', 'rating' => 5, 'text' => 'As someone who is always looking for stylish pieces, Shop.co has become my go-to store. Delivery was quick and everything fit perfectly.'],
            ],

            'newsletter' => ['title' => 'Stay upto date about our latest offers'],

            'footer' => [
                'about' => "We have clothes that suits your style and which you're proud to wear. From women to men.",
                'columns' => [
                    ['title' => 'Company', 'links' => [['label' => 'About'], ['label' => 'Features'], ['label' => 'Works'], ['label' => 'Career']]],
                    ['title' => 'Help', 'links' => [['label' => 'Customer Support'], ['label' => 'Delivery Details'], ['label' => 'Terms & Conditions'], ['label' => 'Privacy Policy']]],
                    ['title' => 'FAQ', 'links' => [
                        ['label' => 'Account', 'href' => '/login'],
                        ['label' => 'Manage Deliveries', 'href' => '/account/orders'],
                        ['label' => 'Orders', 'href' => '/account/orders'],
                        ['label' => 'Payments'],
                    ]],
                    ['title' => 'Resources', 'links' => [['label' => 'Free eBooks'], ['label' => 'Development Tutorial'], ['label' => 'How to - Blog'], ['label' => 'Youtube Playlist']]],
                ],
                'socials' => ['Twitter', 'Facebook', 'Instagram', 'GitHub'],
            ],

            'payments' => ['Visa', 'Mastercard', 'PayPal', 'Apple Pay', 'Google Pay'],

            // Options of the filter sidebar.
            'sizes' => ['XX-Small', 'X-Small', 'Small', 'Medium', 'Large', 'X-Large', 'XX-Large', '3X-Large', '4X-Large'],
            'colors' => [
                ['name' => 'Green', 'hex' => '#00c12b'],
                ['name' => 'Red', 'hex' => '#f50606'],
                ['name' => 'Yellow', 'hex' => '#f5dd06'],
                ['name' => 'Orange', 'hex' => '#f57906'],
                ['name' => 'Cyan', 'hex' => '#06caf5'],
                ['name' => 'Blue', 'hex' => '#063af5'],
                ['name' => 'Purple', 'hex' => '#7d06f5'],
                ['name' => 'Pink', 'hex' => '#f506a4'],
                ['name' => 'White', 'hex' => '#ffffff'],
                ['name' => 'Black', 'hex' => '#000000'],
            ],
        ];

        foreach ($settings as $key => $value) {
            SiteSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
