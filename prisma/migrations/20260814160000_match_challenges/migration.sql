CREATE TYPE "ChallengeStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
ALTER TABLE "Match" ADD COLUMN "guestOrganizationId" TEXT;
ALTER TABLE "Match" ADD COLUMN "challengeStatus" "ChallengeStatus" NOT NULL DEFAULT 'NONE';
CREATE INDEX "Match_guestOrganizationId_challengeStatus_idx"
  ON "Match"("guestOrganizationId", "challengeStatus");
ALTER TABLE "Match"
  ADD CONSTRAINT "Match_guestOrganizationId_fkey"
  FOREIGN KEY ("guestOrganizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
