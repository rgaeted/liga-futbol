import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateImageUpload } from '@/lib/image-upload'
import { matchSideHasCrest, type MatchSide } from '@/lib/match-side-crest'

function parseSide(raw: string): MatchSide | null {
  if (raw === 'A' || raw === 'B') return raw
  return null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; side: string }> }
) {
  const { id, side: rawSide } = await params
  const side = parseSide(rawSide)
  if (!side) {
    return NextResponse.json({ error: 'Lado inválido' }, { status: 400 })
  }

  const match = await db.match.findUnique({
    where: { id },
    select: {
      sideACrestMimeType: true,
      sideACrestData: true,
      sideBCrestMimeType: true,
      sideBCrestData: true,
    },
  })

  if (!match || !matchSideHasCrest(match, side)) {
    return new NextResponse(null, { status: 404 })
  }

  const mimeType = side === 'A' ? match.sideACrestMimeType : match.sideBCrestMimeType
  const data = side === 'A' ? match.sideACrestData : match.sideBCrestData

  return new NextResponse(data, {
    headers: {
      'Content-Type': mimeType!,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; side: string }> }
) {
  const { requireRole } = await import('@/lib/auth')
  const { Role } = await import('@prisma/client')
  await requireRole([Role.ADMIN])

  const { id, side: rawSide } = await params
  const side = parseSide(rawSide)
  if (!side) {
    return NextResponse.json({ error: 'Lado inválido' }, { status: 400 })
  }

  const exists = await db.match.findUnique({
    where: { id },
    select: { id: true, matchType: true },
  })
  if (!exists) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }
  if (exists.matchType !== 'FRIENDLY') {
    return NextResponse.json(
      { error: 'Los escudos de liga se editan en Equipos' },
      { status: 400 }
    )
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

  const crestData =
    side === 'A'
      ? { sideACrestMimeType: mimeType, sideACrestData: buffer }
      : { sideBCrestMimeType: mimeType, sideBCrestData: buffer }

  await db.match.update({ where: { id }, data: crestData })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; side: string }> }
) {
  const { requireRole } = await import('@/lib/auth')
  const { Role } = await import('@prisma/client')
  await requireRole([Role.ADMIN])

  const { id, side: rawSide } = await params
  const side = parseSide(rawSide)
  if (!side) {
    return NextResponse.json({ error: 'Lado inválido' }, { status: 400 })
  }

  const crestData =
    side === 'A'
      ? { sideACrestMimeType: null, sideACrestData: null }
      : { sideBCrestMimeType: null, sideBCrestData: null }

  await db.match.update({ where: { id }, data: crestData })

  return NextResponse.json({ ok: true })
}
