CREATE TABLE "OrgAward" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortLabel" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "description" TEXT,
  "accentColor" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrgAward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerAward" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "orgAwardId" TEXT NOT NULL,
  "seasonId" TEXT,
  "note" TEXT,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "awardedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerAward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrgAward_organizationId_sortOrder_idx" ON "OrgAward"("organizationId", "sortOrder");
CREATE INDEX "PlayerAward_playerId_awardedAt_idx" ON "PlayerAward"("playerId", "awardedAt");
CREATE INDEX "PlayerAward_organizationId_orgAwardId_idx" ON "PlayerAward"("organizationId", "orgAwardId");

CREATE UNIQUE INDEX "PlayerAward_playerId_orgAwardId_seasonId_key"
  ON "PlayerAward"("playerId", "orgAwardId", "seasonId");

ALTER TABLE "OrgAward"
  ADD CONSTRAINT "OrgAward_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_orgAwardId_fkey"
  FOREIGN KEY ("orgAwardId") REFERENCES "OrgAward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_awardedByUserId_fkey"
  FOREIGN KEY ("awardedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
