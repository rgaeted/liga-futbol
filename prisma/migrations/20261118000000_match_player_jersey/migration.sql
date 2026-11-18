-- CreateTable
CREATE TABLE "MatchPlayerJersey" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamKey" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchPlayerJersey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayerJersey_matchId_playerId_key" ON "MatchPlayerJersey"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayerJersey_matchId_teamKey_number_key" ON "MatchPlayerJersey"("matchId", "teamKey", "number");

-- AddForeignKey
ALTER TABLE "MatchPlayerJersey" ADD CONSTRAINT "MatchPlayerJersey_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerJersey" ADD CONSTRAINT "MatchPlayerJersey_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
