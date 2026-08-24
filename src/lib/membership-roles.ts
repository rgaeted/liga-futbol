import { db } from '@/lib/db'
import type { MembershipRole } from '@/lib/membership-role'
import { MembershipRole as Role } from '@/lib/membership-role'

export async function mergeMembershipRole(
  userId: string,
  organizationId: string,
  role: MembershipRole,
): Promise<void> {
  const membership = await db.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { id: true, roles: true },
  })
  if (!membership) return
  if (membership.roles.includes(role)) return

  await db.organizationMembership.update({
    where: { id: membership.id },
    data: { roles: [...membership.roles, role] },
  })
}

export async function setMembershipRoles(
  userId: string,
  organizationId: string,
  roles: MembershipRole[],
): Promise<void> {
  const unique = [...new Set(roles)]
  if (unique.length === 0) {
    throw new Error('Membership requires at least one role')
  }

  await db.organizationMembership.update({
    where: { organizationId_userId: { organizationId, userId } },
    data: { roles: unique },
  })
}

export const ASSIGNABLE_MEMBERSHIP_ROLES = [
  Role.ORG_ADMIN,
  Role.COACH,
  Role.REFEREE,
  Role.PLAYER,
] as const

export type AssignableMembershipRole = (typeof ASSIGNABLE_MEMBERSHIP_ROLES)[number]

export function isAssignableMembershipRole(role: MembershipRole): role is AssignableMembershipRole {
  return (ASSIGNABLE_MEMBERSHIP_ROLES as readonly MembershipRole[]).includes(role)
}
