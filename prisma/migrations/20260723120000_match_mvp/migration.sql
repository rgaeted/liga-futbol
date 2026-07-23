-- MVP del partido (liga y amistoso)
ALTER TABLE "Match" ADD COLUMN "mvpPlayerId" TEXT;
ALTER TABLE "Match" ADD COLUMN "mvpFriendlyPlayerId" TEXT;

ALTER TABLE "Match" ADD CONSTRAINT "Match_mvpPlayerId_fkey"
  FOREIGN KEY ("mvpPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Match" ADD CONSTRAINT "Match_mvpFriendlyPlayerId_fkey"
  FOREIGN KEY ("mvpFriendlyPlayerId") REFERENCES "FriendlyPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
