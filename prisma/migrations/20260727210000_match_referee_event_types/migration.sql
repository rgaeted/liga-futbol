-- AlterTable
ALTER TABLE "Match" ADD COLUMN "refereeEventTypes" "EventType"[] NOT NULL DEFAULT ARRAY[]::"EventType"[];
