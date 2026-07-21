-- Color de equipo (liga) y lados amistosos
ALTER TABLE "Team" ADD COLUMN "color" TEXT;

ALTER TABLE "Match" ADD COLUMN "sideAColor" TEXT;
ALTER TABLE "Match" ADD COLUMN "sideBColor" TEXT;
