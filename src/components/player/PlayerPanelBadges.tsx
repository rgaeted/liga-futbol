import Link from 'next/link'
import { BadgeCard } from '@/components/badges/BadgeCard'
import type { PlayerBadgeVitrinaDto } from '@/lib/badges/query'
import { orgPath } from '@/lib/tenant-paths'

type Props = {
  vitrina: PlayerBadgeVitrinaDto
  organizationSlug: string
  playerId: string
}

export function PlayerPanelBadges({ vitrina, organizationSlug, playerId }: Props) {
  const earned = vitrina.familias.flatMap((section) =>
    section.items.filter((item) => item.veces > 0),
  )
  const allBadgesHref = orgPath(organizationSlug, `/jugador/${playerId}#insignias-catalogo`)

  return (
    <div id="mis-insignias" className="scroll-mt-24 mt-8 border-t border-[#2A3A32] pt-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-[family-name:var(--font-anton)] text-base uppercase tracking-[0.08em] text-[#E8E4D8]">
          Mis insignias
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A938C]">
            {vitrina.ganadasDistintas} de {vitrina.totalCatalogo} ganadas
          </p>
          <Link
            href={allBadgesHref}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C91F26] hover:underline"
          >
            Ver todas →
          </Link>
        </div>
      </div>

      {earned.length === 0 ? (
        <p className="text-sm text-[#8A938C]">
          Aún sin insignias en la cancha.{' '}
          <Link href={allBadgesHref} className="font-semibold text-[#C91F26] hover:underline">
            Mira el catálogo completo
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {earned.map((item) => (
            <BadgeCard
              key={item.predicateId}
              iconKey={item.iconKey}
              name={item.name}
              description={item.description}
              rarity={item.rarity}
              locked={false}
              proximamente={item.proximamente}
              context={item.context}
            />
          ))}
        </div>
      )}
    </div>
  )
}
