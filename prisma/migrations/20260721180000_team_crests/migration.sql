-- Escudos de equipos (liga) y lados amistosos (por partido)
ALTER TABLE "Team" ADD COLUMN "crestMimeType" TEXT;
ALTER TABLE "Team" ADD COLUMN "crestData" BYTEA;

ALTER TABLE "Match" ADD COLUMN "sideACrestMimeType" TEXT;
ALTER TABLE "Match" ADD COLUMN "sideACrestData" BYTEA;
ALTER TABLE "Match" ADD COLUMN "sideBCrestMimeType" TEXT;
ALTER TABLE "Match" ADD COLUMN "sideBCrestData" BYTEA;
