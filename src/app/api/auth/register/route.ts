import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { registerUserSchema } from '@/lib/validations/auth-register'

export async function POST(req: Request) {
  const parsed = registerUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, name } = parsed.data

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await db.user.create({
    data: { email, passwordHash, name },
  })

  return NextResponse.json({ ok: true })
}
