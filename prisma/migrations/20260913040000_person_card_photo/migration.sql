ALTER TABLE "Person"
  ADD COLUMN "cardPhotoMimeType" TEXT,
  ADD COLUMN "cardPhotoData" BYTEA,
  ADD COLUMN "cardPhotoUpdatedAt" TIMESTAMP(3);
