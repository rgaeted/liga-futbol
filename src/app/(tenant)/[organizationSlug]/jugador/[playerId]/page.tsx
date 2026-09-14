import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { BadgeVitrina } from '@/components/badges/BadgeVitrina'
import { PlayerCard } from '@/components/player-card/PlayerCard'
import { SharePlayerCardButton } from '@/components/player-card/SharePlayerCardButton'
import { getPlayerBadgeVitrina } from '@/lib/badges/query'
import { getLosLunesPlayerCard } from '@/lib/player-card-query'
import { LOSLUNES_SLUG } from '@/lib/org-brand'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string; playerId: string }>
}): Promise<Metadata> {
  const { organizationSlug, playerId } = await params
  const isLosLunes = organizationSlug === LOSLUNES_SLUG
  const card = isLosLunes ? await getLosLunesPlayerCard(playerId) : null
  const vitrina = await getPlayerBadgeVitrina(organizationSlug, playerId)

  if (isLosLunes && card?.kind === 'ok') {
    const url = `https://ligalab.cl/${LOSLUNES_SLUG}/jugador/${playerId}`
    return {
      title: `Carta de ${card.card.player.nombreCorto}`,
      description: 'Stats reales, cero humo.',
      openGraph: {
        title: `Carta de ${card.card.player.nombreCorto}`,
        description: 'Stats reales, cero humo.',
        url,
        images: [{ url: `${url}/og` }],
      },
    }
  }

  if (vitrina.kind === 'ok') {
    const url = `https://ligalab.cl/${organizationSlug}/jugador/${playerId}`
    return {
      title: `Insignias de ${vitrina.vitrina.playerNombre}`,
      description: 'Se ganan en la cancha.',
      openGraph: {
        title: `Insignias de ${vitrina.vitrina.playerNombre}`,
        description: 'Se ganan en la cancha.',
        url,
      },
    }
  }

  return { title: 'Jugador' }
}

function playerCardBackLink(
  organizationSlug: string,
  from: string | undefined,
): { href: string; label: string } {
  if (from === 'player') {
    return {
      href: `/${organizationSlug}/player`,
      label: 'Volver a mi panel',
    }
  }

  return {
    href: `/${organizationSlug}`,
    label: organizationSlug === LOSLUNES_SLUG ? 'Volver a Fútbol de los Lunes' : 'Volver al inicio',
  }
}

export default async function PlayerCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string; playerId: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { organizationSlug, playerId } = await params
  const { from } = await searchParams
  const isLosLunes = organizationSlug === LOSLUNES_SLUG
  const [card, vitrina] = await Promise.all([
    isLosLunes ? getLosLunesPlayerCard(playerId) : Promise.resolve(null),
    getPlayerBadgeVitrina(organizationSlug, playerId),
  ])

  const showCard = isLosLunes && card?.kind === 'ok'
  const showVitrina = vitrina.kind === 'ok'

  if (!showCard && !showVitrina) notFound()

  if (from === 'player' && showCard) {
    redirect(`/${organizationSlug}/player#mi-carta`)
  }

  const path = `/${organizationSlug}/jugador/${playerId}`
  const back = playerCardBackLink(organizationSlug, from)

  return (
    <main
      className="min-h-screen bg-[#0B1210] px-4 py-10 text-[#EDF2EE]"
      style={{ fontFamily: 'var(--font-barlow-condensed), Helvetica Neue, sans-serif' }}
    >
      <nav className="mx-auto mb-6 max-w-[1040px]">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.12em] text-[#8BA598] transition hover:text-[#3DE68C]"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
            <path
              fill="currentColor"
              d="M10.2 2.7 4.9 8l5.3 5.3 1.1-1.1L7.1 8l4.2-4.2-1.1-1.1Z"
            />
          </svg>
          {back.label}
        </Link>
      </nav>

      {showCard ? (
        <>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3DE68C]">
              Fútbol de los Lunes · desde 2014
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-oswald)] text-3xl uppercase tracking-wide">
              La carta se gana en la cancha
            </h1>
            <p className="mt-2 text-[#8BA598]">
              Los mismos goles, asistencias y lunes que ya registras — reunidos en una sola identidad
              que sube y baja según cómo juegues.
            </p>
          </div>
          <div className="mt-8 flex flex-col items-center">
            <PlayerCard card={card.card} />
            <SharePlayerCardButton
              nombreCorto={card.card.player.nombreCorto}
              path={path}
              ogPath={`${path}/og`}
            />
          </div>
        </>
      ) : null}

      {showVitrina ? <BadgeVitrina vitrina={vitrina.vitrina} organizationSlug={organizationSlug} /> : null}
    </main>
  )
}
