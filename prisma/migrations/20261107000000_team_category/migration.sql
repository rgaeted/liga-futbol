ALTER TABLE "Team" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "Team_categoryId_idx" ON "Team"("categoryId");
ALTER TABLE "Team" ADD CONSTRAINT "Team_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FriendlyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
