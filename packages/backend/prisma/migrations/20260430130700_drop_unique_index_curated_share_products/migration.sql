-- The legacy unique rule persisted as a UNIQUE INDEX (see pg_indexes).
-- ALTER TABLE ... DROP CONSTRAINT does not drop a standalone unique index.
DROP INDEX IF EXISTS "curated_share_products_curatedShareId_productId_key";
DROP INDEX IF EXISTS "curated_share_products_curated_share_id_product_id_key";
