import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { createFriendlyCategorySchema } from '@/lib/validations/friendly-category'
import { MembershipRole } from '@/lib/membership-role'

export async function GET() {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const categories = await db.friendlyCategory.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { playerLinks: true, matches: true } },
    },
  })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const parsed = createFriendlyCategorySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const category = await db.friendlyCategory.create({
    data: {
      organizationId,
      name: parsed.data.name,
      description: parsed.data.description,
      isActive: parsed.data.isActive ?? true,
    },
  })
  return NextResponse.json(category, { status: 201 })
}
