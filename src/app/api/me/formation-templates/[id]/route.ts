import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { type SlotLayout } from '@/lib/formation-slot-layout'
import { renameUserFormationTemplateSchema } from '@/lib/validations/user-formation-template'

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const existing = await db.userFormationTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = renameUserFormationTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    )
  }

  try {
    const template = await db.userFormationTemplate.update({
      where: { id },
      data: { name: parsed.data.name },
    })
    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        baseScheme: template.baseScheme,
        footballFormat: template.footballFormat,
        slotLayout: template.slotLayout as SlotLayout,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya tienes una formación personalizada con ese nombre' },
        { status: 409 }
      )
    }
    throw error
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const existing = await db.userFormationTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await db.userFormationTemplate.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
