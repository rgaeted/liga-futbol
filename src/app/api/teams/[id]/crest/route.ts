import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { validateImageUpload } from '@/lib/image-upload'
import { teamHasCrest } from '@/lib/team-crest'
import { MembershipRole } from '@/lib/membership-role'

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
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params
  const exists = await db.team.findUnique({
    where: { id },
    select: { id: true, organizationId: true },
  })
  if (!exists) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  }
  assertSameOrganization(exists.organizationId, organizationId)

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
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const exists = await db.team.findUnique({
    where: { id },
    select: { organizationId: true },
  })
  if (!exists) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  }
  assertSameOrganization(exists.organizationId, organizationId)

  await db.team.update({
    where: { id },
    data: { crestMimeType: null, crestData: null },
  })
  return NextResponse.json({ ok: true })
}
