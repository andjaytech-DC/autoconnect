ALTER TABLE "Dealer" ADD COLUMN "ownerName" TEXT, ADD COLUMN "gstNumber" TEXT, ADD COLUMN "address" TEXT, ADD COLUMN "bankAccount" TEXT, ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING', ADD COLUMN "approvedAt" TIMESTAMP, ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_email_key" UNIQUE ("email");
ALTER TABLE "Vehicle" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VehicleSpecification" ADD COLUMN "batteryCapacityKwh" DOUBLE PRECISION, ADD COLUMN "claimedRangeKm" INTEGER, ADD COLUMN "chargingType" TEXT, ADD COLUMN "fastCharging" BOOLEAN, ADD COLUMN "chargingTimeHours" DOUBLE PRECISION;
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'NEGOTIATING';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'CONVERTED';

CREATE TABLE "InspectionRequest" (
  "id" SERIAL PRIMARY KEY,
  "vehicleId" INTEGER REFERENCES "Vehicle"("id") ON DELETE SET NULL,
  "customerId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "inspectionType" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "preferredDate" TIMESTAMP NOT NULL,
  "preferredTime" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InspectionRequest_status_idx" ON "InspectionRequest"("status");

CREATE TABLE "ServiceProvider" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "city" TEXT NOT NULL,
  "address" TEXT,
  "services" TEXT[] DEFAULT '{}',
  "rating" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ServiceBooking" (
  "id" SERIAL PRIMARY KEY,
  "providerId" INTEGER NOT NULL REFERENCES "ServiceProvider"("id") ON DELETE CASCADE,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "vehicleReg" TEXT,
  "preferredDate" TIMESTAMP NOT NULL,
  "preferredTime" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ServiceBooking_status_idx" ON "ServiceBooking"("status");

CREATE TABLE "InsuranceEnquiry" (
  "id" SERIAL PRIMARY KEY,
  "customerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "registrationNo" TEXT,
  "coverType" TEXT NOT NULL,
  "existingExpiry" TIMESTAMP,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InsuranceEnquiry_status_idx" ON "InsuranceEnquiry"("status");

CREATE TABLE "NewCar" (
  "id" SERIAL PRIMARY KEY,
  "brandName" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "exShowroomPrice" INTEGER NOT NULL,
  "onRoadPrice" INTEGER,
  "fuel" TEXT NOT NULL,
  "transmission" TEXT NOT NULL,
  "mileageKmpl" DOUBLE PRECISION,
  "engine" TEXT,
  "bodyType" TEXT,
  "features" TEXT[] DEFAULT '{}',
  "imageUrl" TEXT,
  "isElectric" BOOLEAN NOT NULL DEFAULT false,
  "batteryCapacityKwh" DOUBLE PRECISION,
  "claimedRangeKm" INTEGER,
  "chargingType" TEXT,
  "fastCharging" BOOLEAN,
  "chargingTimeHours" DOUBLE PRECISION,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("brandName", "model", "variant")
);
CREATE INDEX "NewCar_brandName_idx" ON "NewCar"("brandName");
CREATE INDEX "NewCar_isElectric_idx" ON "NewCar"("isElectric");

CREATE TABLE "MarketplaceProduct" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "brand" TEXT,
  "priceMrp" INTEGER NOT NULL,
  "priceSale" INTEGER,
  "imageUrl" TEXT,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MarketplaceProduct_category_idx" ON "MarketplaceProduct"("category");

CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
