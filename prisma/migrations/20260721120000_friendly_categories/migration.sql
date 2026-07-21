-- CreateTable
CREATE TABLE "FriendlyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendlyCategory_pkey" PRIMARY KEY ("id")
);

-- Seed historical category (fixed id for deterministic backfill)
INSERT INTO "FriendlyCategory" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  'friendly-category-legacy',
  'Amistosos (histórico)',
  'Categoría creada automáticamente para datos previos a categorías amistosas',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- AlterTable Match
ALTER TABLE "Match" ADD COLUMN "friendlyCategoryId" TEXT;

UPDATE "Match"
SET "friendlyCategoryId" = 'friendly-category-legacy'
WHERE "matchType" = 'FRIENDLY';

ALTER TABLE "Match" ADD CONSTRAINT "Match_friendlyCategoryId_fkey"
  FOREIGN KEY ("friendlyCategoryId") REFERENCES "FriendlyCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable FriendlyPlayer (nullable first → backfill → NOT NULL)
ALTER TABLE "FriendlyPlayer" ADD COLUMN "friendlyCategoryId" TEXT;

UPDATE "FriendlyPlayer"
SET "friendlyCategoryId" = 'friendly-category-legacy'
WHERE "friendlyCategoryId" IS NULL;

ALTER TABLE "FriendlyPlayer" ALTER COLUMN "friendlyCategoryId" SET NOT NULL;

ALTER TABLE "FriendlyPlayer" ADD CONSTRAINT "FriendlyPlayer_friendlyCategoryId_fkey"
  FOREIGN KEY ("friendlyCategoryId") REFERENCES "FriendlyCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
