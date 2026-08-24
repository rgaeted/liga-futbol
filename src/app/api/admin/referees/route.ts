import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole, hasMembershipRole } from '@/lib/membership-role'
import { mapPrismaError } from '@/lib/prisma-errors'
import {
  normalizePhoneField,
  refereeListUserInclude,
  serializeRefereeListItem,
} from '@/lib/referees'
import { createRefereeSchema } from '@/lib/validations/referee'

export async function GET() {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])

    const memberships = await db.organizationMembership.findMany({
      where: { organizationId, roles: { has: MembershipRole.REFEREE } },
      include: {
        user: {
          include: refereeListUserInclude(organizationId),
        },
      },
      orderBy: { user: { name: 'asc' } },
    })

    return NextResponse.json(memberships.map((m) => serializeRefereeListItem({ user: m.user })))
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const parsed = createRefereeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { email, name, password, phone, whatsapp, notes } = parsed.data
    const profileData = {
      phone: normalizePhoneField(phone),
      whatsapp: normalizePhoneField(whatsapp),
      notes: notes ?? null,
    }

    const existing = await db.user.findUnique({
      where: { email },
      include: {
        memberships: { where: { organizationId } },
      },
    })

    if (existing) {
      const membership = existing.memberships[0]
      if (membership && hasMembershipRole(membership.roles, MembershipRole.REFEREE)) {
        return NextResponse.json(
          { error: 'Este árbitro ya pita en tu organización' },
          { status: 409 },
        )
      }

      const result = await db.$transaction(async (tx) => {
        if (!membership) {
          await tx.organizationMembership.create({
            data: {
              organizationId,
              userId: existing.id,
              roles: [MembershipRole.REFEREE],
            },
          })
        } else {
          await tx.organizationMembership.update({
            where: { id: membership.id },
            data: { roles: [...membership.roles, MembershipRole.REFEREE] },
          })
        }
        await tx.refereeProfile.upsert({
          where: { userId: existing.id },
          create: { userId: existing.id, ...profileData },
          update: profileData,
        })
        return existing.id
      })

      return NextResponse.json({ userId: result }, { status: 201 })
    }

    if (!password) {
      return NextResponse.json({ error: 'La contraseña es obligatoria para usuarios nuevos' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, name, passwordHash },
        select: { id: true },
      })
      await tx.organizationMembership.create({
        data: {
          organizationId,
          userId: created.id,
          roles: [MembershipRole.REFEREE],
        },
      })
      await tx.refereeProfile.create({
        data: { userId: created.id, ...profileData },
      })
      return created
    })

    return NextResponse.json({ userId: user.id }, { status: 201 })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
