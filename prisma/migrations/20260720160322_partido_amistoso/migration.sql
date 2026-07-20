-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('LEAGUE', 'FRIENDLY');

-- CreateEnum
CREATE TYPE "FriendlySide" AS ENUM ('A', 'B');

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_awayTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_homeTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_seasonId_fkey";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "matchType" "MatchType" NOT NULL DEFAULT 'LEAGUE',
ADD COLUMN     "sideAName" TEXT,
ADD COLUMN     "sideBName" TEXT,
ALTER COLUMN "seasonId" DROP NOT NULL,
ALTER COLUMN "homeTeamId" DROP NOT NULL,
ALTER COLUMN "awayTeamId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "friendlyPlayerId" TEXT,
ADD COLUMN     "side" "FriendlySide";

-- CreateTable
CREATE TABLE "FriendlyPlayer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendlyPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendlyMatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "friendlyPlayerId" TEXT NOT NULL,
    "side" "FriendlySide" NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendlyMatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FriendlyPlayer_userId_key" ON "FriendlyPlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendlyMatchPlayer_matchId_friendlyPlayerId_key" ON "FriendlyMatchPlayer"("matchId", "friendlyPlayerId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_friendlyPlayerId_fkey" FOREIGN KEY ("friendlyPlayerId") REFERENCES "FriendlyPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyPlayer" ADD CONSTRAINT "FriendlyPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyMatchPlayer" ADD CONSTRAINT "FriendlyMatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyMatchPlayer" ADD CONSTRAINT "FriendlyMatchPlayer_friendlyPlayerId_fkey" FOREIGN KEY ("friendlyPlayerId") REFERENCES "FriendlyPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
