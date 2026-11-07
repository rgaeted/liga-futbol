CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'CLUB', 'LEAGUE');

ALTER TABLE "Organization" ADD COLUMN "plan" "BillingPlan" NOT NULL DEFAULT 'FREE';

UPDATE "Organization" SET "plan" = 'LEAGUE';
