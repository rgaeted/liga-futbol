-- Backfill memberships from linked player profiles and friendly DT roster history

INSERT INTO "OrganizationMembership" ("id", "organizationId", "userId", "roles", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  p."organizationId",
  pe."userId",
  ARRAY['PLAYER']::"MembershipRole"[],
  NOW(),
  NOW()
FROM "Player" p
JOIN "Person" pe ON pe.id = p."personId"
WHERE pe."userId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "OrganizationMembership" m
    WHERE m."organizationId" = p."organizationId"
      AND m."userId" = pe."userId"
  );

UPDATE "OrganizationMembership" m
SET roles = m.roles || ARRAY['PLAYER']::"MembershipRole"[]
WHERE NOT (m.roles @> ARRAY['PLAYER']::"MembershipRole"[])
  AND EXISTS (
    SELECT 1
    FROM "Player" p
    JOIN "Person" pe ON pe.id = p."personId"
    WHERE pe."userId" = m."userId"
      AND p."organizationId" = m."organizationId"
  );

UPDATE "OrganizationMembership" m
SET roles = m.roles || ARRAY['FRIENDLY_COACH']::"MembershipRole"[]
WHERE NOT (m.roles @> ARRAY['FRIENDLY_COACH']::"MembershipRole"[])
  AND EXISTS (
    SELECT 1
    FROM "FriendlyMatchPlayer" fmp
    JOIN "Player" p ON p.id = fmp."playerId"
    JOIN "Person" pe ON pe.id = p."personId"
    WHERE fmp."isCoach" = true
      AND pe."userId" = m."userId"
      AND p."organizationId" = m."organizationId"
  );
