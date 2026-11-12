import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSponsorPubliclyVisible } from '@/lib/sponsors/visibility'
import { looksLikeBot, resolveClickTarget } from '@/lib/sponsors/stats'
import { recordSponsorStat } from '@/lib/sponsors/stats-store'

const noStore = { 'Cache-Control': 'no-store' }

function redirect(req: Request, location: string) {
  return NextResponse.redirect(new URL(location, req.url), { status: 302, headers: noStore })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sponsorId: string }> },
) {
  const { sponsorId } = await params
  const to = new URL(req.url).searchParams.get('to') === 'web' ? 'web' : 'cta'

  const sponsor = await db.sponsor.findUnique({
    where: { id: sponsorId },
    select: {
      id: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      ctaUrl: true,
      websiteUrl: true,
      season: { select: { organization: { select: { slug: true } } } },
    },
  })
  if (!sponsor) return redirect(req, '/')

  const landing = `/${sponsor.season.organization.slug}`
  if (!isSponsorPubliclyVisible(sponsor, new Date())) return redirect(req, landing)

  const target = resolveClickTarget(sponsor, to)
  if (!target) return redirect(req, landing)

  if (!looksLikeBot(req.headers.get('user-agent'))) {
    try {
      await recordSponsorStat([sponsor.id], 'clicks')
    } catch {
      // Una falla al contar nunca debe impedir que la persona llegue al auspiciador.
    }
  }
  return NextResponse.redirect(target, { status: 302, headers: noStore })
}
