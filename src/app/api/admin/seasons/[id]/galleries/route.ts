import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { createGallery, listAdminGalleries } from '@/lib/editorial/galleries'
import { mapPrismaError } from '@/lib/prisma-errors'
import { createGallerySchema } from '@/lib/validations/editorial'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId } = await params
    const galleries = await listAdminGalleries(seasonId)
    return NextResponse.json({ galleries })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId } = await params
    const parsed = createGallerySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const gallery = await createGallery(seasonId, parsed.data)
    return NextResponse.json({ gallery }, { status: 201 })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
