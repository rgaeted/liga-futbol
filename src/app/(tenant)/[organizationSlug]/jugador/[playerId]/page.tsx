import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PlayerCard } from '@/components/player-card/PlayerCard'
import { SharePlayerCardButton } from '@/components/player-card/SharePlayerCardButton'
import { getLosLunesPlayerCard } from '@/lib/player-card-query'
import { LOSLUNES_SLUG } from '@/lib/org-brand'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string; playerId: string }>
}): Promise<Metadata> {
  const { organizationSlug, playerId } = await params
  if (organizationSlug !== LOSLUNES_SLUG) return { title: 'Carta' }
  const result = await getLosLunesPlayerCard(playerId)
  if (result.kind !== 'ok') return { title: 'Carta' }
  const url = `https://ligalab.cl/${LOSLUNES_SLUG}/jugador/${playerId}`
  return {
    title: `Carta de ${result.card.player.nombreCorto}`,
    description: 'Stats reales, cero humo.',
    openGraph: {
      title: `Carta de ${result.card.player.nombreCorto}`,
      description: 'Stats reales, cero humo.',
      url,
      images: [{ url: `${url}/og` }],
    },
  }
}

export default async function PlayerCardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; playerId: string }>
}) {
  const { organizationSlug, playerId } = await params
  if (organizationSlug !== LOSLUNES_SLUG) notFound()
  const result = await getLosLunesPlayerCard(playerId)
  if (result.kind !== 'ok') notFound()
  const path = `/${organizationSlug}/jugador/${playerId}`
  return (
    <main
      className="min-h-screen bg-[#0B1210] px-4 py-10 text-[#EDF2EE]"
      style={{ fontFamily: 'var(--font-barlow-condensed), Helvetica Neue, sans-serif' }}
    >
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3DE68C]">
          Fútbol de los Lunes · desde 2014
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide">
          La carta se gana en la cancha
        </h1>
        <p className="mt-2 text-[#8BA598]">
          Los mismos goles, asistencias y lunes que ya registras — reunidos en una sola identidad
          que sube y baja según cómo juegues.
        </p>
      </div>
      <div className="mt-8 flex flex-col items-center">
        <PlayerCard card={result.card} />
        <SharePlayerCardButton
          nombreCorto={result.card.player.nombreCorto}
          path={path}
          ogPath={`${path}/og`}
        />
      </div>
    </main>
  )
}
