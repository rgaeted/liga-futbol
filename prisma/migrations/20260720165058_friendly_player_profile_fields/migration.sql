-- CreateEnum
CREATE TYPE "DominantFoot" AS ENUM ('RIGHT', 'LEFT', 'BOTH');

-- AlterTable
ALTER TABLE "FriendlyPlayer" ADD COLUMN     "dominantFoot" "DominantFoot",
ADD COLUMN     "primaryPosition" TEXT,
ADD COLUMN     "secondaryPosition" TEXT;
