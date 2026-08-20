import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  personHasPhoto,
  validateFriendlyPlayerPhoto,
} from '@/lib/friendly-player-photo'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const player = await db.player.findUnique({
    where: { id },
    select: {
      person: { select: { photoMimeType: true, photoData: true } },
    },
  })

  if (!player?.person || !personHasPhoto(player.person)) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(player.person.photoData, {
    headers: {
      'Content-Type': player.person.photoMimeType!,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requireOrgRole, assertSameOrganization } = await import('@/lib/auth')
  const { MembershipRole } = await import('@/lib/membership-role')
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])

  const { id } = await params
  const exists = await db.player.findUnique({
    where: { id },
    select: { id: true, organizationId: true, personId: true },
  })
  if (!exists) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(exists.organizationId, organizationId)

  const form = await req.formData()
  const file = form.get('photo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Debes enviar un archivo photo' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || 'application/octet-stream'
  const validation = validateFriendlyPlayerPhoto(buffer, mimeType)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  await db.person.update({
    where: { id: exists.personId },
    data: { photoMimeType: mimeType, photoData: buffer },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requireOrgRole, assertSameOrganization } = await import('@/lib/auth')
  const { MembershipRole } = await import('@/lib/membership-role')
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])

  const { id } = await params
  const exists = await db.player.findUnique({
    where: { id },
    select: { organizationId: true, personId: true },
  })
  if (!exists) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(exists.organizationId, organizationId)
  await db.person.update({
    where: { id: exists.personId },
    data: { photoMimeType: null, photoData: null },
  })
  return NextResponse.json({ ok: true })
}
