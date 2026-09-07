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
  const { requirePlayerPhotoMutation } = await import('@/lib/player-photo-access')
  const { id } = await params
  const access = await requirePlayerPhotoMutation(id)
  if ('error' in access) return access.error
  const exists = access.player

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
  const { requirePlayerPhotoMutation } = await import('@/lib/player-photo-access')
  const { id } = await params
  const access = await requirePlayerPhotoMutation(id)
  if ('error' in access) return access.error
  const exists = access.player
  await db.person.update({
    where: { id: exists.personId },
    data: { photoMimeType: null, photoData: null },
  })
  return NextResponse.json({ ok: true })
}
