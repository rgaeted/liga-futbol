import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isSponsorPubliclyVisible } from '@/lib/sponsors/visibility'
import { looksLikeBot } from '@/lib/sponsors/stats'
import { recordSponsorStat } from '@/lib/sponsors/stats-store'

const bodySchema = z.object({
  organizationSlug: z.string().min(1).max(80),
  sponsorIds: z.array(z.string().min(1).max(64)).min(1).max(20),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  if (looksLikeBot(req.headers.get('user-agent'))) {
    return new NextResponse(null, { status: 204 })
  }

  const { organizationSlug, sponsorIds } = parsed.data
  const sponsors = await db.sponsor.findMany({
    where: {
      id: { in: sponsorIds },
      season: { organization: { slug: organizationSlug } },
      // Solo los que el landing realmente puede mostrar: en la franja o presentando cancha/final.
      OR: [{ showOnLanding: true }, { assignments: { some: {} } }],
    },
    select: { id: true, isActive: true, startsAt: true, endsAt: true },
  })
  const now = new Date()
  const visible = sponsors.filter((sponsor) => isSponsorPubliclyVisible(sponsor, now)).map((s) => s.id)
  if (visible.length > 0) {
    try {
      await recordSponsorStat(visible, 'views')
    } catch {
      // Las vistas son un dato secundario: no se reportan fallas a quien navega.
    }
  }
  return new NextResponse(null, { status: 204 })
}
