-- AlterTable
ALTER TABLE "orders" ADD COLUMN "releasedToVendorsAt" TIMESTAMP(3);

-- Existing rows: vendors were already notified at creation time, so treat as released.
UPDATE "orders" SET "releasedToVendorsAt" = "createdAt" WHERE "releasedToVendorsAt" IS NULL;
