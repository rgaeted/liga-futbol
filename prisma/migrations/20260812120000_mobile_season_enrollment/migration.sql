-- CreateEnum
CREATE TYPE "SeasonTeamStatus" AS ENUM ('REGISTERED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SeasonRosterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "SeasonMobileConfig" (
    "seasonId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "logoStoragePath" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonMobileConfig_pkey" PRIMARY KEY ("seasonId")
);

-- CreateTable
CREATE TABLE "SeasonTeam" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "color" TEXT,
    "crestMimeType" TEXT,
    "crestData" BYTEA,
    "status" "SeasonTeamStatus" NOT NULL DEFAULT 'REGISTERED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonRosterEntry" (
    "id" TEXT NOT NULL,
    "seasonTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "jerseyNumber" INTEGER,
    "position" TEXT,
    "status" "SeasonRosterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonRosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonMobileConfig_slug_key" ON "SeasonMobileConfig"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonTeam_seasonId_teamId_key" ON "SeasonTeam"("seasonId", "teamId");

-- CreateIndex
CREATE INDEX "SeasonTeam_seasonId_status_idx" ON "SeasonTeam"("seasonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonRosterEntry_seasonTeamId_playerId_key" ON "SeasonRosterEntry"("seasonTeamId", "playerId");

-- CreateIndex
CREATE INDEX "SeasonRosterEntry_seasonTeamId_status_idx" ON "SeasonRosterEntry"("seasonTeamId", "status");

-- AddForeignKey
ALTER TABLE "SeasonMobileConfig" ADD CONSTRAINT "SeasonMobileConfig_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonTeam" ADD CONSTRAINT "SeasonTeam_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonTeam" ADD CONSTRAINT "SeasonTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRosterEntry" ADD CONSTRAINT "SeasonRosterEntry_seasonTeamId_fkey" FOREIGN KEY ("seasonTeamId") REFERENCES "SeasonTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRosterEntry" ADD CONSTRAINT "SeasonRosterEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
