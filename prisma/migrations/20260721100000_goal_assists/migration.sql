-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN "assistPlayerId" TEXT;
ALTER TABLE "MatchEvent" ADD COLUMN "assistFriendlyPlayerId" TEXT;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_assistPlayerId_fkey" FOREIGN KEY ("assistPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_assistFriendlyPlayerId_fkey" FOREIGN KEY ("assistFriendlyPlayerId") REFERENCES "FriendlyPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
