-- Un DT puede dirigir varios equipos (una categoria por equipo).
-- DropIndex
DROP INDEX "Team_coachId_key";

-- CreateIndex
CREATE INDEX "Team_coachId_idx" ON "Team"("coachId");
