CREATE TYPE "RefereeShareInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

CREATE TABLE "RefereeProfile" (
  "userId" TEXT NOT NULL,
  "phone" TEXT,
  "whatsapp" TEXT,
  "notes" TEXT,
  "photoStoragePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefereeProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "RefereeShareInvite" (
  "id" TEXT NOT NULL,
  "refereeUserId" TEXT NOT NULL,
  "fromOrganizationId" TEXT NOT NULL,
  "toOrganizationId" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "status" "RefereeShareInviteStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefereeShareInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefereeShareInvite_pending_key"
  ON "RefereeShareInvite" ("refereeUserId", "toOrganizationId")
  WHERE "status" = 'PENDING';

CREATE INDEX "RefereeShareInvite_toOrganizationId_status_idx"
  ON "RefereeShareInvite" ("toOrganizationId", "status");

CREATE INDEX "RefereeShareInvite_refereeUserId_idx"
  ON "RefereeShareInvite" ("refereeUserId");

INSERT INTO "RefereeProfile" ("userId", "createdAt", "updatedAt")
SELECT DISTINCT m."userId", NOW(), NOW()
FROM "OrganizationMembership" m
WHERE m."role" = 'REFEREE'
ON CONFLICT ("userId") DO NOTHING;

ALTER TABLE "RefereeProfile"
  ADD CONSTRAINT "RefereeProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeShareInvite"
  ADD CONSTRAINT "RefereeShareInvite_refereeUserId_fkey"
  FOREIGN KEY ("refereeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeShareInvite"
  ADD CONSTRAINT "RefereeShareInvite_fromOrganizationId_fkey"
  FOREIGN KEY ("fromOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeShareInvite"
  ADD CONSTRAINT "RefereeShareInvite_toOrganizationId_fkey"
  FOREIGN KEY ("toOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeShareInvite"
  ADD CONSTRAINT "RefereeShareInvite_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
