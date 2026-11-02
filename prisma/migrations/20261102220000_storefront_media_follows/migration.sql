-- AlterTable
ALTER TABLE "BoostService" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Follow_sellerId_idx" ON "Follow"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_sellerId_key" ON "Follow"("userId", "sellerId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: listings that were already live count as published (followers are only told about new ones).
UPDATE "Listing" SET "publishedAt" = "createdAt" WHERE "status" IN ('ACTIVE', 'PAUSED', 'SOLD_OUT');
