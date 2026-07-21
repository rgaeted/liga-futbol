-- CreateTable
CREATE TABLE "FriendlyPlayerCategory" (
    "friendlyPlayerId" TEXT NOT NULL,
    "friendlyCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendlyPlayerCategory_pkey" PRIMARY KEY ("friendlyPlayerId","friendlyCategoryId")
);

INSERT INTO "FriendlyPlayerCategory" ("friendlyPlayerId", "friendlyCategoryId")
SELECT "id", "friendlyCategoryId" FROM "FriendlyPlayer";

ALTER TABLE "FriendlyPlayerCategory" ADD CONSTRAINT "FriendlyPlayerCategory_friendlyPlayerId_fkey"
  FOREIGN KEY ("friendlyPlayerId") REFERENCES "FriendlyPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendlyPlayerCategory" ADD CONSTRAINT "FriendlyPlayerCategory_friendlyCategoryId_fkey"
  FOREIGN KEY ("friendlyCategoryId") REFERENCES "FriendlyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendlyPlayer" DROP CONSTRAINT "FriendlyPlayer_friendlyCategoryId_fkey";
ALTER TABLE "FriendlyPlayer" DROP COLUMN "friendlyCategoryId";
