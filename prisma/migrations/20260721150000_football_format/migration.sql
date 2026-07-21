-- CreateEnum
CREATE TYPE "FootballFormat" AS ENUM ('FUTBOL_5', 'FUTBOL_7', 'FUTBOL_11');

-- AlterTable
ALTER TABLE "Season" ADD COLUMN "footballFormat" "FootballFormat" NOT NULL DEFAULT 'FUTBOL_11';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "footballFormat" "FootballFormat" NOT NULL DEFAULT 'FUTBOL_11';
