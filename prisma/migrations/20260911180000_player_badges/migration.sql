ALTER TABLE "Organization" ADD COLUMN "badgesEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "OrgBadge" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "predicateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "family" TEXT NOT NULL,
  "rarity" TEXT NOT NULL,
  "iconKey" TEXT NOT NULL,
  "thresholds" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrgBadge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerBadge" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "orgBadgeId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgBadge_organizationId_predicateId_key"
  ON "OrgBadge"("organizationId", "predicateId");

CREATE INDEX "OrgBadge_organizationId_sortOrder_idx" ON "OrgBadge"("organizationId", "sortOrder");

CREATE UNIQUE INDEX "PlayerBadge_playerId_orgBadgeId_matchId_key"
  ON "PlayerBadge"("playerId", "orgBadgeId", "matchId");

CREATE INDEX "PlayerBadge_playerId_awardedAt_idx" ON "PlayerBadge"("playerId", "awardedAt");
CREATE INDEX "PlayerBadge_matchId_idx" ON "PlayerBadge"("matchId");
CREATE INDEX "PlayerBadge_organizationId_orgBadgeId_idx" ON "PlayerBadge"("organizationId", "orgBadgeId");

ALTER TABLE "OrgBadge"
  ADD CONSTRAINT "OrgBadge_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerBadge"
  ADD CONSTRAINT "PlayerBadge_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerBadge"
  ADD CONSTRAINT "PlayerBadge_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerBadge"
  ADD CONSTRAINT "PlayerBadge_orgBadgeId_fkey"
  FOREIGN KEY ("orgBadgeId") REFERENCES "OrgBadge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerBadge"
  ADD CONSTRAINT "PlayerBadge_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
