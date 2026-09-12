import { ImageResponse } from 'next/og'
import { PlayerCardOgImage } from '@/components/player-card/PlayerCardOgImage'
import {
  PLAYER_CARD_DISPLAY_FONT_OG,
  PLAYER_CARD_DISPLAY_FONT_OG_URL,
} from '@/lib/player-card-shield'
import { getLosLunesPlayerCard } from '@/lib/player-card-query'
import { LOSLUNES_SLUG } from '@/lib/org-brand'

export const dynamic = 'force-dynamic'

function absUrl(origin: string, path: string): string {
  return new URL(path, origin).toString()
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ organizationSlug: string; playerId: string }> },
) {
  const { organizationSlug, playerId } = await params
  if (organizationSlug !== LOSLUNES_SLUG) {
    return new Response(null, { status: 404 })
  }
  const result = await getLosLunesPlayerCard(playerId)
  if (result.kind !== 'ok') {
    return new Response(null, { status: 404 })
  }

  const origin = new URL(req.url).origin
  const { player } = result.card
  const oswaldBold = await fetch(PLAYER_CARD_DISPLAY_FONT_OG_URL).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0B1210 0%, #14241D 50%, #0B1210 100%)',
        }}
      >
        <PlayerCardOgImage
          card={result.card}
          fotoUrl={absUrl(origin, player.fotoUrl)}
          escudoUrl={absUrl(origin, player.escudoUrl)}
          width={420}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: PLAYER_CARD_DISPLAY_FONT_OG,
          data: oswaldBold,
          style: 'normal',
          weight: 700,
        },
      ],
    },
  )
}
