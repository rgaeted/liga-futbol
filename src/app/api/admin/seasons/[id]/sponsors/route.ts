import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { createSponsor, listAdminSponsors } from '@/lib/editorial/sponsors'
import { mapPrismaError } from '@/lib/prisma-errors'
import { createSponsorSchema } from '@/lib/validations/editorial'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId } = await params
    const sponsors = await listAdminSponsors(seasonId)
    return NextResponse.json({ sponsors })
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
    const parsed = createSponsorSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const sponsor = await createSponsor(seasonId, parsed.data)
    return NextResponse.json({ sponsor }, { status: 201 })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
