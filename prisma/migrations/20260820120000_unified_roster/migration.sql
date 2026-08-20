-- Additive schema for unified org roster (backfill via scripts/migrate-unified-roster.ts)

ALTER TABLE "Player" ADD COLUMN "dominantFoot" "DominantFoot";
ALTER TABLE "Player" ADD COLUMN "primaryPosition" TEXT;
ALTER TABLE "Player" ADD COLUMN "secondaryPosition" TEXT;

CREATE TABLE "PlayerCategory" (
    "playerId" TEXT NOT NULL,
    "friendlyCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCategory_pkey" PRIMARY KEY ("playerId","friendlyCategoryId")
);

ALTER TABLE "FriendlyMatchPlayer" ADD COLUMN "playerId" TEXT;

ALTER TABLE "PlayerCategory" ADD CONSTRAINT "PlayerCategory_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerCategory" ADD CONSTRAINT "PlayerCategory_friendlyCategoryId_fkey"
  FOREIGN KEY ("friendlyCategoryId") REFERENCES "FriendlyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendlyMatchPlayer" ADD CONSTRAINT "FriendlyMatchPlayer_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
