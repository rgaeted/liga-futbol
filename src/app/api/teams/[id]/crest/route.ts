import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateImageUpload } from '@/lib/image-upload'
import { teamHasCrest } from '@/lib/team-crest'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const team = await db.team.findUnique({
    where: { id },
    select: { crestMimeType: true, crestData: true },
  })

  if (!team || !teamHasCrest(team)) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(team.crestData, {
    headers: {
      'Content-Type': team.crestMimeType!,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requireRole } = await import('@/lib/auth')
  const { Role } = await import('@prisma/client')
  await requireRole([Role.ADMIN])

  const { id } = await params
  const exists = await db.team.findUnique({ where: { id }, select: { id: true } })
  if (!exists) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  }

  const form = await req.formData()
  const file = form.get('crest')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Debes enviar un archivo crest' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || 'application/octet-stream'
  const validation = validateImageUpload(buffer, mimeType)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  await db.team.update({
    where: { id },
    data: { crestMimeType: mimeType, crestData: buffer },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requireRole } = await import('@/lib/auth')
  const { Role } = await import('@prisma/client')
  await requireRole([Role.ADMIN])

  const { id } = await params
  await db.team.update({
    where: { id },
    data: { crestMimeType: null, crestData: null },
  })
  return NextResponse.json({ ok: true })
}
