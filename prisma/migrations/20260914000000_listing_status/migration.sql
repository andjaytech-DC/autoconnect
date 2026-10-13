CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- Existing listings stay visible: default is PUBLISHED; new drafts are
-- created explicitly with listingStatus = DRAFT by the vehicle form.
ALTER TABLE "Vehicle" ADD COLUMN "listingStatus" "ListingStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateIndex
CREATE INDEX "Vehicle_listingStatus_idx" ON "Vehicle"("listingStatus");