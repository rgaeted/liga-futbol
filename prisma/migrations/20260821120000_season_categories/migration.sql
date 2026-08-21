-- CreateTable
CREATE TABLE "SeasonCategory" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeasonCategory_seasonId_categoryId_key" ON "SeasonCategory"("seasonId", "categoryId");
CREATE INDEX "SeasonCategory_seasonId_sortOrder_idx" ON "SeasonCategory"("seasonId", "sortOrder");

ALTER TABLE "SeasonCategory"
  ADD CONSTRAINT "SeasonCategory_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeasonCategory"
  ADD CONSTRAINT "SeasonCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "FriendlyCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SeasonTeam" ADD COLUMN "seasonCategoryId" TEXT;
ALTER TABLE "Match" ADD COLUMN "seasonCategoryId" TEXT;

CREATE INDEX "Match_seasonCategoryId_idx" ON "Match"("seasonCategoryId");

-- Backfill: org with exactly one active FriendlyCategory
INSERT INTO "SeasonCategory" ("id", "seasonId", "categoryId", "sortOrder")
SELECT
  'sc_' || s."id",
  s."id",
  only_cat."id",
  0
FROM "Season" s
INNER JOIN (
  SELECT "organizationId", MIN("id") AS "id"
  FROM "FriendlyCategory"
  WHERE "isActive" = TRUE
  GROUP BY "organizationId"
  HAVING COUNT(*) = 1
) only_cat ON only_cat."organizationId" = s."organizationId"
WHERE EXISTS (
  SELECT 1 FROM "SeasonTeam" st WHERE st."seasonId" = s."id"
)
OR EXISTS (
  SELECT 1 FROM "Match" m WHERE m."seasonId" = s."id" AND m."matchType" = 'LEAGUE'
);

UPDATE "SeasonTeam" st
SET "seasonCategoryId" = sc."id"
FROM "SeasonCategory" sc
WHERE sc."seasonId" = st."seasonId"
  AND st."seasonCategoryId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "SeasonCategory" sc2
    WHERE sc2."seasonId" = st."seasonId" AND sc2."id" <> sc."id"
  );

UPDATE "Match" m
SET "seasonCategoryId" = sc."id"
FROM "SeasonCategory" sc
WHERE sc."seasonId" = m."seasonId"
  AND m."matchType" = 'LEAGUE'
  AND m."seasonCategoryId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "SeasonCategory" sc2
    WHERE sc2."seasonId" = m."seasonId" AND sc2."id" <> sc."id"
  );

ALTER TABLE "SeasonTeam"
  ADD CONSTRAINT "SeasonTeam_seasonCategoryId_fkey"
  FOREIGN KEY ("seasonCategoryId") REFERENCES "SeasonCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_seasonCategoryId_fkey"
  FOREIGN KEY ("seasonCategoryId") REFERENCES "SeasonCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "SeasonTeam_seasonId_teamId_key";
CREATE UNIQUE INDEX "SeasonTeam_seasonCategoryId_teamId_key" ON "SeasonTeam"("seasonCategoryId", "teamId");
