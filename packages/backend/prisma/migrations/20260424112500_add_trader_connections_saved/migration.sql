-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TRADER';

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "category_attributes" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "traderId" TEXT;

-- AlterTable
ALTER TABLE "vendor_category_attributes" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_products" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connections_followerId_idx" ON "connections"("followerId");

-- CreateIndex
CREATE INDEX "connections_followingId_idx" ON "connections"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "connections_followerId_followingId_key" ON "connections"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "saved_products_userId_idx" ON "saved_products"("userId");

-- CreateIndex
CREATE INDEX "saved_products_productId_idx" ON "saved_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_products_userId_productId_key" ON "saved_products"("userId", "productId");

-- CreateIndex
CREATE INDEX "products_traderId_idx" ON "products"("traderId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
