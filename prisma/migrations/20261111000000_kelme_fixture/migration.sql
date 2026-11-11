-- Fixture automático (Kelme Cup): fase, grupo, cancha, cupos pendientes y auditoría.
CREATE TYPE "MatchPhase" AS ENUM ('GROUP', 'LEAGUE', 'FINAL', 'THIRD_PLACE', 'FIFTH_PLACE');
CREATE TYPE "MatchDecidedBy" AS ENUM ('REGULAR_TIME', 'PENALTIES', 'ADMINISTRATIVE');

ALTER TABLE "Season" ADD COLUMN "fixtureConfig" JSONB;
ALTER TABLE "SeasonTeam" ADD COLUMN "groupCode" TEXT;

ALTER TABLE "Match"
  ADD COLUMN "fixtureCode" TEXT,
  ADD COLUMN "phase" "MatchPhase",
  ADD COLUMN "groupCode" TEXT,
  ADD COLUMN "court" INTEGER,
  ADD COLUMN "endsAt" TIMESTAMP(3),
  ADD COLUMN "homeSlot" TEXT,
  ADD COLUMN "awaySlot" TEXT,
  ADD COLUMN "decidedBy" "MatchDecidedBy",
  ADD COLUMN "penaltyHome" INTEGER,
  ADD COLUMN "penaltyAway" INTEGER;

CREATE UNIQUE INDEX "Match_seasonId_fixtureCode_key" ON "Match"("seasonId", "fixtureCode");

CREATE TABLE "FixtureAuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "matchId" TEXT,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FixtureAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FixtureAuditLog_seasonId_createdAt_idx" ON "FixtureAuditLog"("seasonId", "createdAt");
CREATE INDEX "FixtureAuditLog_matchId_idx" ON "FixtureAuditLog"("matchId");

ALTER TABLE "FixtureAuditLog" ADD CONSTRAINT "FixtureAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixtureAuditLog" ADD CONSTRAINT "FixtureAuditLog_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixtureAuditLog" ADD CONSTRAINT "FixtureAuditLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
