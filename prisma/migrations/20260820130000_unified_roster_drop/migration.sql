-- Drop legacy FriendlyPlayer dual-FK after backfill (scripts/migrate-unified-roster.ts)

-- FriendlyMatchPlayer: require playerId, drop friendlyPlayerId
ALTER TABLE "FriendlyMatchPlayer" DROP CONSTRAINT IF EXISTS "FriendlyMatchPlayer_friendlyPlayerId_fkey";
DROP INDEX IF EXISTS "FriendlyMatchPlayer_matchId_friendlyPlayerId_key";
ALTER TABLE "FriendlyMatchPlayer" DROP COLUMN IF EXISTS "friendlyPlayerId";
ALTER TABLE "FriendlyMatchPlayer" ALTER COLUMN "playerId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "FriendlyMatchPlayer_matchId_playerId_key"
  ON "FriendlyMatchPlayer"("matchId", "playerId");

-- MatchEvent: drop friendly FK columns
ALTER TABLE "MatchEvent" DROP CONSTRAINT IF EXISTS "MatchEvent_friendlyPlayerId_fkey";
ALTER TABLE "MatchEvent" DROP CONSTRAINT IF EXISTS "MatchEvent_assistFriendlyPlayerId_fkey";
ALTER TABLE "MatchEvent" DROP COLUMN IF EXISTS "friendlyPlayerId";
ALTER TABLE "MatchEvent" DROP COLUMN IF EXISTS "assistFriendlyPlayerId";

-- MatchTeamMvp: drop friendly FK
ALTER TABLE "MatchTeamMvp" DROP CONSTRAINT IF EXISTS "MatchTeamMvp_friendlyPlayerId_fkey";
ALTER TABLE "MatchTeamMvp" DROP COLUMN IF EXISTS "friendlyPlayerId";

-- FriendlyPlayerCategory + FriendlyPlayer
DROP TABLE IF EXISTS "FriendlyPlayerCategory";
DROP TABLE IF EXISTS "FriendlyPlayer";
