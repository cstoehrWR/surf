-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('SURF', 'KITE', 'SUP', 'WINDSURF', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('SESSION', 'NIGHTLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductType" ADD VALUE 'ACCOMMODATION';
ALTER TYPE "ProductType" ADD VALUE 'CAMPING';

-- AlterTable
ALTER TABLE "BookingItem" ADD COLUMN     "checkIn" DATE,
ADD COLUMN     "checkOut" DATE;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sports" "SportType"[] DEFAULT ARRAY['SURF']::"SportType"[],
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bookingMode" "BookingMode" NOT NULL DEFAULT 'SESSION',
ADD COLUMN     "sportType" "SportType" NOT NULL DEFAULT 'SURF';

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LodgingUnit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LodgingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LodgingNight" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "bookingItemId" TEXT NOT NULL,
    "night" DATE NOT NULL,

    CONSTRAINT "LodgingNight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f766e',
    "accentColor" TEXT NOT NULL DEFAULT '#fbbf24',
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "socialInstagram" TEXT,
    "socialFacebook" TEXT,
    "footerText" TEXT,
    "showBookingCta" BOOLEAN NOT NULL DEFAULT true,
    "customDomain" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitePage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "navLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "showInNav" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,

    CONSTRAINT "SiteBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "pageSlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LodgingUnit_organizationId_code_key" ON "LodgingUnit"("organizationId", "code");

-- CreateIndex
CREATE INDEX "LodgingNight_night_idx" ON "LodgingNight"("night");

-- CreateIndex
CREATE UNIQUE INDEX "LodgingNight_unitId_night_key" ON "LodgingNight"("unitId", "night");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_organizationId_key" ON "SiteSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_customDomain_key" ON "SiteSettings"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "SitePage_organizationId_slug_key" ON "SitePage"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "SiteBlock_pageId_sortOrder_idx" ON "SiteBlock"("pageId", "sortOrder");

-- CreateIndex
CREATE INDEX "ContactMessage_organizationId_createdAt_idx" ON "ContactMessage"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LodgingUnit" ADD CONSTRAINT "LodgingUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LodgingUnit" ADD CONSTRAINT "LodgingUnit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LodgingUnit" ADD CONSTRAINT "LodgingUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LodgingNight" ADD CONSTRAINT "LodgingNight_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "LodgingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LodgingNight" ADD CONSTRAINT "LodgingNight_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "BookingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitePage" ADD CONSTRAINT "SitePage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteBlock" ADD CONSTRAINT "SiteBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
