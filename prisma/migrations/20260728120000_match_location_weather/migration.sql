-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "regionCode" TEXT,
ADD COLUMN     "regionName" TEXT,
ADD COLUMN     "communeCode" TEXT,
ADD COLUMN     "communeName" TEXT,
ADD COLUMN     "communeLat" DOUBLE PRECISION,
ADD COLUMN     "communeLon" DOUBLE PRECISION,
ADD COLUMN     "weatherTempC" DOUBLE PRECISION,
ADD COLUMN     "weatherHumidityPct" INTEGER,
ADD COLUMN     "weatherWindKmh" DOUBLE PRECISION,
ADD COLUMN     "weatherCode" INTEGER,
ADD COLUMN     "weatherLabel" TEXT,
ADD COLUMN     "weatherFetchedAt" TIMESTAMP(3);
