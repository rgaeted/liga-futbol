import bcrypt from 'bcryptjs'
import { MembershipRole } from '@/lib/membership-role'
import { parseOrganizationSlug } from '@/lib/organization-slug'
import { db } from '@/lib/db'
import type { CreateOrganizationInput } from '@/lib/validations/organization'

export type OrganizationErrorCode =
  | 'reserved'
  | 'invalid'
  | 'slug_taken'
  | 'admin_exists'
  | 'admin_password_required'

export class OrganizationError extends Error {
  code: OrganizationErrorCode

  constructor(code: OrganizationErrorCode) {
    super(code)
    this.code = code
  }
}

export async function createOrganization(input: CreateOrganizationInput) {
  const slugResult = parseOrganizationSlug(input.slug)
  if (!slugResult.ok) {
    throw new OrganizationError(slugResult.error)
  }

  const existingOrg = await db.organization.findUnique({
    where: { slug: slugResult.slug },
  })
  if (existingOrg) {
    throw new OrganizationError('slug_taken')
  }

  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        slug: slugResult.slug,
        name: input.name,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        status: 'ACTIVE',
      },
    })

    if (!input.adminEmail) {
      return { organization, adminUserId: null }
    }

    const existingUser = await tx.user.findUnique({
      where: { email: input.adminEmail },
      include: {
        memberships: { where: { organizationId: organization.id } },
      },
    })

    if (existingUser) {
      if (existingUser.memberships.length > 0) {
        throw new OrganizationError('admin_exists')
      }

      await tx.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: existingUser.id,
          role: MembershipRole.ORG_ADMIN,
        },
      })

      return { organization, adminUserId: existingUser.id }
    }

    if (!input.adminPassword || input.adminPassword.length < 6) {
      throw new OrganizationError('admin_password_required')
    }

    const passwordHash = await bcrypt.hash(input.adminPassword, 10)
    const adminUser = await tx.user.create({
      data: {
        email: input.adminEmail,
        name: input.adminName as string,
        passwordHash,
        memberships: {
          create: {
            organizationId: organization.id,
            role: MembershipRole.ORG_ADMIN,
          },
        },
      },
    })

    return { organization, adminUserId: adminUser.id }
  })
}

export async function setOrganizationStatus(id: string, status: 'ACTIVE' | 'PAUSED') {
  return db.organization.update({
    where: { id },
    data: { status },
  })
}

export async function listOrganizations() {
  return db.organization.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { memberships: true } },
    },
  })
}
