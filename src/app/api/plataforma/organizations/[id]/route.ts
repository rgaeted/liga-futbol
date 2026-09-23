import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { mapPrismaError } from '@/lib/prisma-errors'
import { setOrganizationPlan, setOrganizationStatus } from '@/lib/organizations'
import {
  updateOrganizationPlanSchema,
  updateOrganizationStatusSchema,
} from '@/lib/validations/organization'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePlatformAdmin()
    const { id } = await params
    const body = await req.json()

    if ('plan' in body) {
      const parsed = updateOrganizationPlanSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      }
      const organization = await setOrganizationPlan(id, parsed.data.plan)
      return NextResponse.json(organization)
    }

    const parsed = updateOrganizationStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const organization = await setOrganizationStatus(id, parsed.data.status)
    return NextResponse.json(organization)
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
