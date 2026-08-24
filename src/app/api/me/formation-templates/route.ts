import { NextResponse } from 'next/server'
import { FootballFormat, Prisma, type UserFormationTemplate } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateSlotLayout, type SlotLayout } from '@/lib/formation-slot-layout'
import { isValidScheme } from '@/lib/formations'
import { createUserFormationTemplateSchema } from '@/lib/validations/user-formation-template'

function serializeTemplate(t: UserFormationTemplate) {
  return {
    id: t.id,
    name: t.name,
    baseScheme: t.baseScheme,
    footballFormat: t.footballFormat,
    slotLayout: t.slotLayout as SlotLayout,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

function parseFootballFormat(value: string | null): FootballFormat | null {
  if (!value) return null
  if (Object.values(FootballFormat).includes(value as FootballFormat)) {
    return value as FootballFormat
  }
  return null
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const format = parseFootballFormat(searchParams.get('format'))
  if (!format) {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }

  const templates = await db.userFormationTemplate.findMany({
    where: { userId: session.user.id, footballFormat: format },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ templates: templates.map(serializeTemplate) })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createUserFormationTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    )
  }

  const { name, baseScheme, footballFormat, slotLayout } = parsed.data

  if (!isValidScheme(baseScheme, footballFormat)) {
    return NextResponse.json({ error: 'Esquema inválido para el formato' }, { status: 400 })
  }

  const layoutCheck = validateSlotLayout(baseScheme, footballFormat, slotLayout)
  if (!layoutCheck.ok) {
    return NextResponse.json({ error: layoutCheck.error }, { status: 400 })
  }

  try {
    const template = await db.userFormationTemplate.create({
      data: {
        userId: session.user.id,
        name,
        baseScheme,
        footballFormat,
        slotLayout: slotLayout as Prisma.InputJsonValue,
      },
    })
    return NextResponse.json({ template: serializeTemplate(template) }, { status: 201 })
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
