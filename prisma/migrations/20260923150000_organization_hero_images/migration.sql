-- CreateTable
CREATE TABLE "OrganizationHeroImage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationHeroImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationHeroImage_organizationId_sortOrder_idx" ON "OrganizationHeroImage"("organizationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "OrganizationHeroImage" ADD CONSTRAINT "OrganizationHeroImage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
