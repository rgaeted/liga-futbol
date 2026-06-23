import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createTeamSchema } from '@/lib/validations/team'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const body = await req.json()
  const parsed = createTeamSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const team = await db.team.update({ where: { id }, data: parsed.data })
  return NextResponse.json(team)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  await db.team.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
