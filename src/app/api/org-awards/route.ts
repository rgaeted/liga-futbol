import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { createOrgAwardSchema } from '@/lib/validations/org-award'
import { MembershipRole } from '@/lib/membership-role'

export async function GET() {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const awards = await db.orgAward.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { playerAwards: true } } },
  })
  return NextResponse.json(awards)
}

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const parsed = createOrgAwardSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const award = await db.orgAward.create({
    data: {
      organizationId,
      name: parsed.data.name,
      shortLabel: parsed.data.shortLabel,
      emoji: parsed.data.emoji,
      description: parsed.data.description,
      accentColor: parsed.data.accentColor,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  })
  return NextResponse.json(award, { status: 201 })
}
