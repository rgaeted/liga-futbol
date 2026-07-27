-- Capitán por equipo en partidos amistosos
ALTER TABLE "FriendlyMatchPlayer" ADD COLUMN "isCaptain" BOOLEAN NOT NULL DEFAULT false;
