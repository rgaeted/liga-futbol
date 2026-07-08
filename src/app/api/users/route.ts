import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createUserSchema } from '@/lib/validations/user'
import { Role } from '@prisma/client'

export async function GET() {
  await requireRole([Role.ADMIN])
  const users = await db.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.COACH, Role.REFEREE] } },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, password, role } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: { email, name, passwordHash, role },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json(user, { status: 201 })
}
