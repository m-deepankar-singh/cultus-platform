# Product Image Implementation

This document tracks the implementation of product image functionality in the admin panel.

## Completed Tasks

- [x] Add `image_url` column to `products` table (verified it already exists).
- [x] Create `product_images` storage bucket in Supabase.
- [x] Set up RLS policies for the `product_images` bucket (Admin/Staff can manage, public read).
- [x] Add `uploadProductImage` helper to `lib/supabase/upload-helpers.ts`.
- [x] Update `ProductSchema` and `UpdateProductSchema` in `lib/schemas/product.ts` to include `image_url` and remove `is_active`.
- [x] Update API route `app/api/admin/products/route.ts` (POST and GET handlers) for `image_url` and remove `is_active` filter.
- [x] Update API route `app/api/admin/products/[productId]/route.ts` (PUT, PATCH, DELETE handlers) for `image_url`, including old image removal, linter fixes, and removing `is_active` references.
- [x] Create `ProductImageSchema` in `lib/schemas/product-image.ts` for file validation (5MB limit).
- [x] Update `components/products/product-form.tsx` to include image upload (5MB limit, 16:9 hint) and remove `is_active`.
- [x] Update `components/products/products-table.tsx` to display product images and remove `is_active` from interface.
- [x] Verified `components/courses-dashboard.tsx` is already set up to display `image_url` if provided.
- [x] Update product detail page/component `app/(dashboard)/products/[id]/page.tsx` (and its sub-component `components/products/product-details.tsx`) to display product image, fix related linter errors, and remove `is_active` from interface.

## Future Tasks (Optional)

- [ ] Add UI for cropping/resizing images to 16:9.
- [ ] Add a default placeholder image if no product image is uploaded (partially done in `courses-dashboard.tsx`, `ImageIcon` used elsewhere).

## Implementation Plan

Admins/Staff can upload images for products. These images are stored in the `product_images` bucket and displayed in product listings and detail views.

### Features

1. Upload image (max 5MB, 16:9 recommended) when creating/editing a product.
2. Display image in product lists/tables.
3. Display image on product detail page.
4. Display image on the main courses dashboard.
5. Remove/replace product image.

### Relevant Files

- `products` table in Supabase (has `image_url`, does not have `is_active`).
- `product_images` storage bucket in Supabase.
- `lib/supabase/upload-helpers.ts` (contains `uploadProductImage`).
- `lib/schemas/product.ts` (Product schemas with `image_url`, without `is_active`).
- `lib/schemas/product-image.ts` (Product image file validation).
- `app/api/admin/products/route.ts` (Product creation API).
- `app/api/admin/products/[productId]/route.ts` (Product update/delete API).
- `components/products/product-form.tsx` (Product form with image upload).
- `components/ui/file-upload.tsx` (Reusable file upload component).
- `components/products/products-table.tsx` (Admin product table display).
- `components/courses-dashboard.tsx` (User-facing dashboard display).
- `app/(dashboard)/products/[id]/page.tsx` - Admin product detail page.
- `components/products/product-details.tsx` - Admin product detail component.

### Storage Structure

Product images are stored in the `product_images` bucket, organized by product ID if provided:
- `products/{productId}/{uniqueFileName}.{extension}`
- `products/{uniqueFileName}.{extension}` (if productId is not available during initial upload before product creation)

### Security & Validation

- RLS: Admin/Staff can manage images; public read access.
- Validation: Max 5MB, allowed image types (PNG, JPG, WEBP, GIF). 