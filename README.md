# LOCA COLLECTION — Supabase-connected GitHub Pages version

This package connects the storefront and admin dashboard to the Supabase project configured for LOCA COLLECTION.

## Upload to GitHub Pages
Replace your current `index.html` and `admin.html` with the two files in this folder.

## Storefront
Orders are sent through the Supabase `place_order` RPC. Product prices are read from the `products` table. The publishable key is safe to use in browser code when Row Level Security is configured correctly.

## Admin
Admin login uses Supabase Authentication. The signed-in user must also exist in `public.admin_users`. Orders, customers, order items and products are read from Supabase. Order status updates are saved centrally.

## Important
Do not put a Supabase secret/service-role key in GitHub or browser code.

## Current payment behavior
Checkout records Cash on Delivery or Bank Transfer. No online card payment gateway is connected yet.
