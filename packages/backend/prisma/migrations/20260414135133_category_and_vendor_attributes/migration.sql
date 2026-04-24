-- AlterTable
ALTER TABLE "categories" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "attributeValues" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "category_attributes" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_category_attributes" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_attributes_categoryId_idx" ON "category_attributes"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_categoryId_name_key" ON "category_attributes"("categoryId", "name");

-- CreateIndex
CREATE INDEX "vendor_category_attributes_vendorId_idx" ON "vendor_category_attributes"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_category_attributes_categoryId_idx" ON "vendor_category_attributes"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_category_attributes_vendorId_categoryId_name_key" ON "vendor_category_attributes"("vendorId", "categoryId", "name");

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_category_attributes" ADD CONSTRAINT "vendor_category_attributes_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_category_attributes" ADD CONSTRAINT "vendor_category_attributes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
