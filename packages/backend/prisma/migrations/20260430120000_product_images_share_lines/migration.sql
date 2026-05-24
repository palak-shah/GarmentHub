-- CreateTable product_images (timestamped uploads per product)
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_images_productId_url_key" ON "product_images"("productId", "url");
CREATE INDEX "product_images_productId_createdAt_idx" ON "product_images"("productId", "createdAt" DESC);

ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy text[] column (newest uploads first visual order preserved via createdAt)
INSERT INTO "product_images" ("id", "productId", "url", "createdAt")
SELECT
    md5(concat_ws('|', p."id", t.url::text, t.ord::text)),
    p."id",
    t.url::text,
    p."updatedAt" - ((t.ord - 1) * interval '1 microsecond')
FROM "products" p
CROSS JOIN LATERAL unnest(p.images) WITH ORDINALITY AS t(url, ord);

-- curated_share_products: optional link to which photo is highlighted for this share line
ALTER TABLE "curated_share_products" ADD COLUMN "productImageId" TEXT;

UPDATE "curated_share_products" csp
SET "productImageId" = pi."id"
FROM (
    SELECT DISTINCT ON ("productId") "id", "productId"
    FROM "product_images"
    ORDER BY "productId", "createdAt" DESC
) pi
WHERE csp."productId" = pi."productId";

ALTER TABLE "curated_share_products" ADD CONSTRAINT "curated_share_products_productImageId_fkey" FOREIGN KEY ("productImageId") REFERENCES "product_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Allow multiple rows per (share, product) for different photos; drop old pairing constraint
ALTER TABLE "curated_share_products" DROP CONSTRAINT IF EXISTS "curated_share_products_curatedShareId_productId_key";
