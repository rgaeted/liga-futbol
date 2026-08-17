import bcrypt from 'bcryptjs'
import { MembershipRole } from '@/lib/membership-role'
import { db } from '@/lib/db'

export type PlatformOrgAdminErrorCode =
  | 'invalid_orgs'
  | 'password_required'
  | 'not_found'
  | 'not_org_admin'

export class PlatformOrgAdminError extends Error {
  code: PlatformOrgAdminErrorCode
  constructor(code: PlatformOrgAdminErrorCode) {
    super(code)
    this.code = code
  }
}

export type OrgAdminOrganization = {
  id: string
  slug: string
  name: string
  status: 'ACTIVE' | 'PAUSED'
}

export type OrgAdminUser = {
  id: string
  email: string
  name: string
  organizations: OrgAdminOrganization[]
}

const orgAdminSelect = {
  id: true,
  email: true,
  name: true,
  memberships: {
    where: { role: MembershipRole.ORG_ADMIN },
    select: {
      organization: {
        select: { id: true, slug: true, name: true, status: true },
      },
    },
  },
} as const

function toOrgAdminUser(user: {
  id: string
  email: string
  name: string
  memberships: Array<{ organization: OrgAdminOrganization }>
}): OrgAdminUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizations: user.memberships.map((m) => m.organization),
  }
}

async function loadActiveOrganizations(organizationIds: string[]) {
  const orgs = await db.organization.findMany({
    where: { id: { in: organizationIds } },
    select: { id: true, slug: true, name: true, status: true },
  })
  if (
    orgs.length !== organizationIds.length ||
    orgs.some((org) => org.status !== 'ACTIVE')
  ) {
    throw new PlatformOrgAdminError('invalid_orgs')
  }
  return orgs
}

async function loadOrgAdminUser(email: string): Promise<OrgAdminUser> {
  const user = await db.user.findUnique({
    where: { email },
    select: orgAdminSelect,
  })
  if (!user) {
    throw new PlatformOrgAdminError('not_found')
  }
  return toOrgAdminUser(user)
}

export async function grantOrgAdminAccess(input: {
  email: string
  name: string
  password?: string
  organizationIds: string[]
}): Promise<{ created: boolean; user: OrgAdminUser }> {
  await loadActiveOrganizations(input.organizationIds)

  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })

  if (!existing && (!input.password || input.password.length < 6)) {
    throw new PlatformOrgAdminError('password_required')
  }

  await db.$transaction(async (tx) => {
    let userId = existing?.id
    if (!userId) {
      const passwordHash = await bcrypt.hash(input.password as string, 10)
      const created = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      })
      userId = created.id
    }

    for (const organizationId of input.organizationIds) {
      const membership = await tx.organizationMembership.findUnique({
        where: {
          organizationId_userId: { organizationId, userId },
        },
      })
      if (!membership) {
        await tx.organizationMembership.create({
          data: {
            organizationId,
            userId,
            role: MembershipRole.ORG_ADMIN,
          },
        })
        continue
      }
      if (membership.role !== MembershipRole.ORG_ADMIN) {
        await tx.organizationMembership.update({
          where: { id: membership.id },
          data: { role: MembershipRole.ORG_ADMIN },
        })
      }
    }
  })

  return {
    created: !existing,
    user: await loadOrgAdminUser(input.email),
  }
}
