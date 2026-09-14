import type { PlayerCardDto } from '@/lib/player-card-query'
import { PlayerCard } from '@/components/player-card/PlayerCard'
import { SharePlayerCardButton } from '@/components/player-card/SharePlayerCardButton'
import { PlayerPanelSection } from '@/components/player/PlayerPanelSection'

type Props = {
  card: PlayerCardDto
  organizationSlug: string
  playerId: string
}

const ATTR_LABELS: Array<{ key: keyof PlayerCardDto['atributos']; label: string }> = [
  { key: 'TIR', label: 'Tiro' },
  { key: 'VIS', label: 'Visión' },
  { key: 'RES', label: 'Resist.' },
  { key: 'REG', label: 'Regate' },
  { key: 'RIT', label: 'Ritmo' },
  { key: 'FIS', label: 'Físico' },
]

export function PlayerPanelCardSection({ card, organizationSlug, playerId }: Props) {
  const path = `/${organizationSlug}/jugador/${playerId}`
  const enFormacion = card.estado === 'en_formacion'

  return (
    <PlayerPanelSection
      title="Mi carta"
      action={
        card.ovr != null ? (
          <span className="font-[family-name:var(--font-anton)] text-2xl text-[#E8C878]">
            {card.ovr}
            <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A938C]">
              OVR
            </span>
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A938C]">
            En formación
          </span>
        )
      }
    >
      <div id="mi-carta" className="scroll-mt-24">
        <p className="text-xs text-[#8A938C]">
          Ventana de {card.ventana.dias} días · {card.ventana.pj} partidos registrados
          {enFormacion ? ` · faltan ${card.partidosFaltantes} para carta completa` : null}
        </p>

        <div className="mt-5 flex flex-col items-center">
          <PlayerCard card={card} />
          <SharePlayerCardButton
            nombreCorto={card.player.nombreCorto}
            path={path}
            ogPath={`${path}/og`}
          />
        </div>

        {!enFormacion ? (
          <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ATTR_LABELS.map(({ key, label }) => {
              const value = card.atributos[key]
              return (
                <div
                  key={key}
                  className="rounded-lg border border-[#2A3A32] bg-[#0B1210] px-2 py-2 text-center"
                >
                  <p className="font-[family-name:var(--font-anton)] text-xl text-[#E8E4D8]">
                    {value ?? '—'}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A938C]">
                    {label}
                  </p>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </PlayerPanelSection>
  )
}
