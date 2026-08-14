-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ORG_ADMIN', 'COACH', 'REFEREE', 'PLAYER', 'FRIENDLY_COACH');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoStoragePath" TEXT,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (required before ON CONFLICT inserts)
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Team" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Match" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "FriendlyCategory" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "FriendlyPlayer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Article" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Gallery" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Sponsor" ADD COLUMN "organizationId" TEXT;

-- Insert Kelme organization
INSERT INTO "Organization" ("id", "slug", "name", "primaryColor", "secondaryColor", "status", "updatedAt")
VALUES (
  'org_kelme',
  'kelme',
  'Torneos Kelme',
  '#CD212A',
  '#FFFFFF',
  'ACTIVE',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Backfill organizationId from Kelme
UPDATE "Season"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

UPDATE "Team"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

UPDATE "Match"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

UPDATE "FriendlyCategory"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

UPDATE "FriendlyPlayer"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

UPDATE "Article"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

UPDATE "Gallery"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

UPDATE "Sponsor"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

-- Make organizationId required
ALTER TABLE "Season" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Team" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Match" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "FriendlyCategory" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "FriendlyPlayer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Article" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Gallery" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Sponsor" ALTER COLUMN "organizationId" SET NOT NULL;

-- Backfill memberships from User.role before dropping role
INSERT INTO "OrganizationMembership" ("id", "organizationId", "userId", "role", "updatedAt")
SELECT
  concat('mem_', "User"."id"),
  (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme'),
  "User"."id",
  CASE "User"."role"
    WHEN 'ADMIN' THEN 'ORG_ADMIN'::"MembershipRole"
    ELSE "User"."role"::text::"MembershipRole"
  END,
  CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("organizationId", "userId") DO NOTHING;

-- Drop legacy User.role
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyCategory" ADD CONSTRAINT "FriendlyCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyPlayer" ADD CONSTRAINT "FriendlyPlayer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
