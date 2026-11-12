-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('MAIN', 'OFFICIAL');

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "ctaLabel" TEXT,
ADD COLUMN     "ctaUrl" TEXT,
ADD COLUMN     "showOnLanding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "tier" "SponsorTier" NOT NULL DEFAULT 'OFFICIAL';

-- CreateTable
CREATE TABLE "SponsorAssignment" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorMonthlyStat" (
    "sponsorId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SponsorMonthlyStat_pkey" PRIMARY KEY ("sponsorId","month")
);

-- CreateIndex
CREATE INDEX "SponsorAssignment_sponsorId_idx" ON "SponsorAssignment"("sponsorId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorAssignment_seasonId_target_key" ON "SponsorAssignment"("seasonId", "target");

-- AddForeignKey
ALTER TABLE "SponsorAssignment" ADD CONSTRAINT "SponsorAssignment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorAssignment" ADD CONSTRAINT "SponsorAssignment_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorMonthlyStat" ADD CONSTRAINT "SponsorMonthlyStat_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

