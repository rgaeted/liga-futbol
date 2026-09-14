import type { PlayerCardDto } from '@/lib/player-card-query'
import type { PlayerBadgeVitrinaDto } from '@/lib/badges/query'
import { PlayerCard } from '@/components/player-card/PlayerCard'
import { SharePlayerCardButton } from '@/components/player-card/SharePlayerCardButton'
import { PlayerPanelBadges } from '@/components/player/PlayerPanelBadges'
import { PlayerPanelSection } from '@/components/player/PlayerPanelSection'

type Props = {
  card: PlayerCardDto
  organizationSlug: string
  playerId: string
  vitrina?: PlayerBadgeVitrinaDto | null
}

export function PlayerPanelCardSection({ card, organizationSlug, playerId, vitrina }: Props) {
  const path = `/${organizationSlug}/jugador/${playerId}`

  return (
    <PlayerPanelSection title="Mi carta">
      <div id="mi-carta" className="scroll-mt-24">
        {card.estado === 'en_formacion' ? (
          <p className="text-xs text-[#8A938C]">
            Faltan {card.partidosFaltantes}{' '}
            {card.partidosFaltantes === 1 ? 'partido' : 'partidos'} para tu primera carta completa.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col items-center">
          <PlayerCard card={card} />
          <SharePlayerCardButton
            nombreCorto={card.player.nombreCorto}
            path={path}
            ogPath={`${path}/og`}
          />
        </div>

        {vitrina ? <PlayerPanelBadges vitrina={vitrina} /> : null}
      </div>
    </PlayerPanelSection>
  )
}
