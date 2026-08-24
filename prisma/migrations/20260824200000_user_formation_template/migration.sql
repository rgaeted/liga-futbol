CREATE TABLE "UserFormationTemplate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseScheme" TEXT NOT NULL,
  "footballFormat" "FootballFormat" NOT NULL,
  "slotLayout" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserFormationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFormationTemplate_userId_footballFormat_name_key"
  ON "UserFormationTemplate"("userId", "footballFormat", "name");

CREATE INDEX "UserFormationTemplate_userId_footballFormat_idx"
  ON "UserFormationTemplate"("userId", "footballFormat");

ALTER TABLE "UserFormationTemplate"
  ADD CONSTRAINT "UserFormationTemplate_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
