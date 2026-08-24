-- Multi-role membership: one row per user/org with roles[]

ALTER TABLE "OrganizationMembership" ADD COLUMN "roles" "MembershipRole"[];

UPDATE "OrganizationMembership" SET "roles" = ARRAY["role"];

ALTER TABLE "OrganizationMembership" ALTER COLUMN "roles" SET NOT NULL;

ALTER TABLE "OrganizationMembership" DROP COLUMN "role";
