import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { personHasPhoto } from '@/lib/friendly-player-photo'
import {
  MAX_CARD_PHOTO_BYTES,
  personHasCardPhoto,
} from '@/lib/player-card-photo'
import { validateProcessedCardPhoto } from '@/lib/player-card-photo-validation'
import { revalidateOrgAdminRosterPages } from '@/lib/revalidate-org-admin-pages'

const CARD_PHOTO_CACHE_CONTROL =
  'public, max-age=3600, stale-while-revalidate=86400'
const MAX_CARD_PHOTO_REQUEST_BYTES = MAX_CARD_PHOTO_BYTES + 256 * 1024

type RouteContext = {
  params: Promise<{ id: string }>
}

async function readCardPhoto(
  req: Request,
  { params }: RouteContext,
  includeBody: boolean,
): Promise<NextResponse> {
  const { id } = await params
  const player = await db.player.findUnique({
    where: { id },
    select: {
      person: {
        select: {
          cardPhotoMimeType: true,
          cardPhotoData: true,
          cardPhotoUpdatedAt: true,
          photoMimeType: true,
          photoData: true,
        },
      },
    },
  })

  if (!player?.person) {
    return new NextResponse(null, { status: 404 })
  }

  const hasCardPhoto = personHasCardPhoto(player.person)
  const hasOriginalPhoto = personHasPhoto(player.person)
  if (!hasCardPhoto && !hasOriginalPhoto) {
    return new NextResponse(null, { status: 404 })
  }

  const data = hasCardPhoto
    ? player.person.cardPhotoData!
    : player.person.photoData!
  const mimeType = hasCardPhoto
    ? player.person.cardPhotoMimeType!
    : player.person.photoMimeType!
  const etag = `"${createHash('sha256').update(data).digest('hex')}"`
  const headers = {
    'Content-Type': mimeType,
    'Cache-Control': CARD_PHOTO_CACHE_CONTROL,
    ETag: etag,
  }
  const ifNoneMatch = req.headers.get('if-none-match')
  if (
    ifNoneMatch
      ?.split(',')
      .map((candidate) => candidate.trim())
      .some(
        (candidate) =>
          candidate === '*' ||
          candidate === etag ||
          candidate === `W/${etag}`,
      )
  ) {
    return new NextResponse(null, { status: 304, headers })
  }

  return new NextResponse(includeBody ? data : null, {
    headers,
  })
}

export async function GET(req: Request, context: RouteContext) {
  return readCardPhoto(req, context, true)
}

export async function HEAD(req: Request, context: RouteContext) {
  return readCardPhoto(req, context, false)
}

export async function POST(req: Request, { params }: RouteContext) {
  const { requirePlayerPhotoMutation } = await import(
    '@/lib/player-photo-access'
  )
  const { id } = await params
  const access = await requirePlayerPhotoMutation(id)
  if ('error' in access) return access.error

  const sourceEtag =
    req.headers.get('if-match') ?? req.headers.get('x-photo-source-etag')
  if (!sourceEtag) {
    return NextResponse.json(
      { error: 'Debes identificar la versión de la foto original.' },
      { status: 428 },
    )
  }
  const createOnly = req.headers.get('if-none-match')?.trim() === '*'

  const contentLength = Number(req.headers.get('content-length'))
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_CARD_PHOTO_REQUEST_BYTES
  ) {
    return NextResponse.json(
      {
        error:
          'La solicitud para el recorte supera el tamaño máximo permitido.',
      },
      { status: 413 },
    )
  }

  const form = await req.formData()
  const file = form.get('photo')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Debes enviar un archivo photo' },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = await validateProcessedCardPhoto(buffer, file.type)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const current = await db.person.findUnique({
    where: { id: access.player.personId },
    select: {
      photoData: true,
      cardPhotoMimeType: true,
      cardPhotoUpdatedAt: true,
    },
  })
  const currentEtag = current?.photoData
    ? `"${createHash('sha256').update(current.photoData).digest('hex')}"`
    : null
  if (currentEtag !== sourceEtag) {
    return NextResponse.json(
      {
        error:
          'La foto original cambió. Descárgala y prepara el recorte nuevamente.',
      },
      { status: 412 },
    )
  }
  if (
    createOnly &&
    (current?.cardPhotoMimeType || current?.cardPhotoUpdatedAt)
  ) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      updatedAt: current.cardPhotoUpdatedAt?.toISOString() ?? null,
    })
  }

  const updatedAt = new Date()
  await db.person.update({
    where: { id: access.player.personId },
    data: {
      cardPhotoMimeType: 'image/png',
      cardPhotoData: buffer,
      cardPhotoUpdatedAt: updatedAt,
    },
  })
  await revalidateOrgAdminRosterPages(access.player.organizationId)

  return NextResponse.json({ ok: true, updatedAt: updatedAt.toISOString() })
}
