import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { createFriendlyCategorySchema } from '@/lib/validations/friendly-category'

export async function GET() {
  await requireRole([Role.ADMIN])
  const categories = await db.friendlyCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { players: true, matches: true } },
    },
  })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createFriendlyCategorySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const category = await db.friendlyCategory.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      isActive: parsed.data.isActive ?? true,
    },
  })
  return NextResponse.json(category, { status: 201 })
}
