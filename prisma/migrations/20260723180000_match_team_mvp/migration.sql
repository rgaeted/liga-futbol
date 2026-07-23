-- MVP por equipo (local / visitante) con foto dedicada
CREATE TYPE "MatchMvpSide" AS ENUM ('HOME', 'AWAY');

CREATE TABLE "MatchTeamMvp" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "side" "MatchMvpSide" NOT NULL,
  "playerId" TEXT,
  "friendlyPlayerId" TEXT,
  "photoMimeType" TEXT,
  "photoData" BYTEA,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MatchTeamMvp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchTeamMvp_matchId_side_key" ON "MatchTeamMvp"("matchId", "side");

ALTER TABLE "MatchTeamMvp"
  ADD CONSTRAINT "MatchTeamMvp_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchTeamMvp"
  ADD CONSTRAINT "MatchTeamMvp_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchTeamMvp"
  ADD CONSTRAINT "MatchTeamMvp_friendlyPlayerId_fkey"
  FOREIGN KEY ("friendlyPlayerId") REFERENCES "FriendlyPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrar MVP único legacy → local cuando aplique
INSERT INTO "MatchTeamMvp" ("id", "matchId", "side", "playerId", "friendlyPlayerId", "updatedAt")
SELECT
  'mtmvp_' || m."id" || '_home',
  m."id",
  'HOME'::"MatchMvpSide",
  m."mvpPlayerId",
  NULL,
  CURRENT_TIMESTAMP
FROM "Match" m
JOIN "Player" p ON p."id" = m."mvpPlayerId"
WHERE m."mvpPlayerId" IS NOT NULL
  AND m."matchType" = 'LEAGUE'
  AND p."teamId" = m."homeTeamId";

INSERT INTO "MatchTeamMvp" ("id", "matchId", "side", "playerId", "friendlyPlayerId", "updatedAt")
SELECT
  'mtmvp_' || m."id" || '_away',
  m."id",
  'AWAY'::"MatchMvpSide",
  m."mvpPlayerId",
  NULL,
  CURRENT_TIMESTAMP
FROM "Match" m
JOIN "Player" p ON p."id" = m."mvpPlayerId"
WHERE m."mvpPlayerId" IS NOT NULL
  AND m."matchType" = 'LEAGUE'
  AND p."teamId" = m."awayTeamId";

INSERT INTO "MatchTeamMvp" ("id", "matchId", "side", "playerId", "friendlyPlayerId", "updatedAt")
SELECT
  'mtmvp_' || m."id" || '_home',
  m."id",
  'HOME'::"MatchMvpSide",
  NULL,
  m."mvpFriendlyPlayerId",
  CURRENT_TIMESTAMP
FROM "Match" m
JOIN "FriendlyMatchPlayer" fmp
  ON fmp."matchId" = m."id" AND fmp."friendlyPlayerId" = m."mvpFriendlyPlayerId"
WHERE m."mvpFriendlyPlayerId" IS NOT NULL
  AND m."matchType" = 'FRIENDLY'
  AND fmp."side" = 'A';

INSERT INTO "MatchTeamMvp" ("id", "matchId", "side", "playerId", "friendlyPlayerId", "updatedAt")
SELECT
  'mtmvp_' || m."id" || '_away',
  m."id",
  'AWAY'::"MatchMvpSide",
  NULL,
  m."mvpFriendlyPlayerId",
  CURRENT_TIMESTAMP
FROM "Match" m
JOIN "FriendlyMatchPlayer" fmp
  ON fmp."matchId" = m."id" AND fmp."friendlyPlayerId" = m."mvpFriendlyPlayerId"
WHERE m."mvpFriendlyPlayerId" IS NOT NULL
  AND m."matchType" = 'FRIENDLY'
  AND fmp."side" = 'B';

ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_mvpPlayerId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_mvpFriendlyPlayerId_fkey";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "mvpPlayerId";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "mvpFriendlyPlayerId";
