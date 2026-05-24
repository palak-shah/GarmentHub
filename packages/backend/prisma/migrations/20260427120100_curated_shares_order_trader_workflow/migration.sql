-- Baseline missing objects (were in schema but never migrated before 20260428100000).

-- CreateEnum
CREATE TYPE "OrderMode" AS ENUM ('DIRECT', 'MANAGED');

-- CreateEnum
CREATE TYPE "WorkflowState" AS ENUM ('UNSEEN', 'SEEN', 'SHARED', 'ORDERED', 'SKIPPED');

-- AlterTable: managed / trader-attributed orders
ALTER TABLE "orders" ADD COLUMN "traderId" TEXT;
ALTER TABLE "orders" ADD COLUMN "orderMode" "OrderMode" NOT NULL DEFAULT 'DIRECT';

CREATE INDEX "orders_traderId_idx" ON "orders"("traderId");

ALTER TABLE "orders" ADD CONSTRAINT "orders_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: invite links
ALTER TABLE "users" ADD COLUMN "inviteCode" TEXT;

CREATE UNIQUE INDEX "users_inviteCode_key" ON "users"("inviteCode");

-- AlterTable: optional price ceiling
ALTER TABLE "products" ADD COLUMN "priceMax" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "curated_shares" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "note" TEXT,
    "orderMode" "OrderMode" NOT NULL DEFAULT 'DIRECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curated_shares_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "curated_shares_traderId_idx" ON "curated_shares"("traderId");

ALTER TABLE "curated_shares" ADD CONSTRAINT "curated_shares_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable (traderOfferUnitPrice added in 20260428100000; productImageId in 20260430120000)
CREATE TABLE "curated_share_products" (
    "id" TEXT NOT NULL,
    "curatedShareId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "curated_share_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curated_share_products_curatedShareId_productId_key" ON "curated_share_products"("curatedShareId", "productId");
CREATE INDEX "curated_share_products_productId_idx" ON "curated_share_products"("productId");

ALTER TABLE "curated_share_products" ADD CONSTRAINT "curated_share_products_curatedShareId_fkey" FOREIGN KEY ("curatedShareId") REFERENCES "curated_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "curated_share_products" ADD CONSTRAINT "curated_share_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "curated_share_recipients" (
    "id" TEXT NOT NULL,
    "curatedShareId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "curated_share_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curated_share_recipients_curatedShareId_customerId_key" ON "curated_share_recipients"("curatedShareId", "customerId");
CREATE INDEX "curated_share_recipients_customerId_isRead_idx" ON "curated_share_recipients"("customerId", "isRead");

ALTER TABLE "curated_share_recipients" ADD CONSTRAINT "curated_share_recipients_curatedShareId_fkey" FOREIGN KEY ("curatedShareId") REFERENCES "curated_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "curated_share_recipients" ADD CONSTRAINT "curated_share_recipients_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "user_product_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "state" "WorkflowState" NOT NULL DEFAULT 'UNSEEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_product_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_product_states_userId_productId_key" ON "user_product_states"("userId", "productId");
CREATE INDEX "user_product_states_userId_state_idx" ON "user_product_states"("userId", "state");
CREATE INDEX "user_product_states_productId_idx" ON "user_product_states"("productId");

ALTER TABLE "user_product_states" ADD CONSTRAINT "user_product_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_product_states" ADD CONSTRAINT "user_product_states_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
