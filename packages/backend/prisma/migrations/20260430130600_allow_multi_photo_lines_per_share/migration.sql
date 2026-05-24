-- Multiple rows per curated share may reference the same product with different
-- product_image_id values (distinct photos). Postgres may still have this legacy constraint.
ALTER TABLE "curated_share_products" DROP CONSTRAINT IF EXISTS "curated_share_products_curatedShareId_productId_key";
ALTER TABLE "curated_share_products" DROP CONSTRAINT IF EXISTS "curated_share_products_curated_share_id_product_id_key";
