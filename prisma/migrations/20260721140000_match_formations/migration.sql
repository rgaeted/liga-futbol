-- CreateTable
CREATE TABLE "MatchFormation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT,
    "side" "FriendlySide",
    "scheme" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchFormation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchFormation_matchId_teamId_key" ON "MatchFormation"("matchId", "teamId");
CREATE UNIQUE INDEX "MatchFormation_matchId_side_key" ON "MatchFormation"("matchId", "side");

ALTER TABLE "MatchFormation" ADD CONSTRAINT "MatchFormation_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallUp" ADD COLUMN "slotKey" TEXT;

ALTER TABLE "FriendlyMatchPlayer" ADD COLUMN "isStarter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FriendlyMatchPlayer" ADD COLUMN "slotKey" TEXT;
