-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "clockStartedAt" TIMESTAMP(3),
ADD COLUMN     "secondHalfStartedAt" TIMESTAMP(3),
ADD COLUMN     "halftimeAt" TIMESTAMP(3);
