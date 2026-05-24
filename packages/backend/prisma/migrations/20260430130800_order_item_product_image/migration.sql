-- Optional FK per catalog photo referenced by an order line (picked-from-share flow).
ALTER TABLE "order_items" ADD COLUMN "productImageId" TEXT;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productImageId_fkey"
  FOREIGN KEY ("productImageId") REFERENCES "product_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "order_items_productImageId_idx" ON "order_items"("productImageId");
