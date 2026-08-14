-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "photoMimeType" TEXT,
    "photoData" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (Postgres allows multiple NULL userIds)
CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId");

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Player" ADD COLUMN "personId" TEXT;
ALTER TABLE "FriendlyPlayer" ADD COLUMN "personId" TEXT;

-- Backfill Person from league Player + User
INSERT INTO "Person" ("id", "userId", "firstName", "lastName", "createdAt", "updatedAt")
SELECT
  'psn_' || p."id",
  p."userId",
  CASE
    WHEN btrim(u."name") = '' THEN 'Sin nombre'
    WHEN position(' ' in btrim(u."name")) = 0 THEN btrim(u."name")
    ELSE split_part(btrim(u."name"), ' ', 1)
  END,
  CASE
    WHEN btrim(u."name") = '' THEN ''
    WHEN position(' ' in btrim(u."name")) = 0 THEN ''
    ELSE btrim(substr(btrim(u."name"), position(' ' in btrim(u."name")) + 1))
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Player" p
JOIN "User" u ON u."id" = p."userId";

-- Link Player to Person
UPDATE "Player" SET "personId" = 'psn_' || "id";

-- Backfill Player.organizationId from Team
UPDATE "Player" p
SET "organizationId" = t."organizationId"
FROM "Team" t
WHERE p."teamId" = t."id"
  AND p."organizationId" IS NULL;

-- Fallback: membership PLAYER
UPDATE "Player" p
SET "organizationId" = om."organizationId"
FROM "OrganizationMembership" om
WHERE p."userId" = om."userId"
  AND om."role" = 'PLAYER'
  AND p."organizationId" IS NULL;

-- Fallback: Kelme org
UPDATE "Player"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'kelme')
WHERE "organizationId" IS NULL;

-- FriendlyPlayer with userId that already has Person (same user as league Player)
UPDATE "FriendlyPlayer" fp
SET "personId" = per."id"
FROM "Person" per
WHERE fp."userId" IS NOT NULL
  AND per."userId" = fp."userId";

-- FriendlyPlayer with userId without Person: create Person
INSERT INTO "Person" ("id", "userId", "firstName", "lastName", "createdAt", "updatedAt")
SELECT
  'psn_fp_' || fp."id",
  fp."userId",
  fp."firstName",
  fp."lastName",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "FriendlyPlayer" fp
WHERE fp."userId" IS NOT NULL
  AND fp."personId" IS NULL;

UPDATE "FriendlyPlayer" fp
SET "personId" = 'psn_fp_' || fp."id"
WHERE fp."userId" IS NOT NULL
  AND fp."personId" IS NULL;

-- FriendlyPlayer without userId: create Person from firstName/lastName
INSERT INTO "Person" ("id", "userId", "firstName", "lastName", "createdAt", "updatedAt")
SELECT
  'psn_fp_' || fp."id",
  NULL,
  fp."firstName",
  fp."lastName",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "FriendlyPlayer" fp
WHERE fp."userId" IS NULL
  AND fp."personId" IS NULL;

UPDATE "FriendlyPlayer" fp
SET "personId" = 'psn_fp_' || fp."id"
WHERE fp."userId" IS NULL
  AND fp."personId" IS NULL;

-- Unique indexes after backfill, before SET NOT NULL
CREATE UNIQUE INDEX "Player_personId_organizationId_key" ON "Player"("personId", "organizationId");
CREATE UNIQUE INDEX "FriendlyPlayer_personId_organizationId_key" ON "FriendlyPlayer"("personId", "organizationId");
CREATE INDEX "Player_organizationId_idx" ON "Player"("organizationId");

-- Make columns required
ALTER TABLE "Player" ALTER COLUMN "personId" SET NOT NULL;
ALTER TABLE "Player" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "FriendlyPlayer" ALTER COLUMN "personId" SET NOT NULL;

-- Drop legacy userId columns
ALTER TABLE "Player" DROP CONSTRAINT "Player_userId_fkey";
DROP INDEX "Player_userId_key";
ALTER TABLE "Player" DROP COLUMN "userId";

ALTER TABLE "FriendlyPlayer" DROP CONSTRAINT "FriendlyPlayer_userId_fkey";
DROP INDEX "FriendlyPlayer_userId_key";
ALTER TABLE "FriendlyPlayer" DROP COLUMN "userId";

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Player" ADD CONSTRAINT "Player_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Player" ADD CONSTRAINT "Player_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendlyPlayer" ADD CONSTRAINT "FriendlyPlayer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
