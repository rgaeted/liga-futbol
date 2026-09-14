import { BadgeCard } from '@/components/badges/BadgeCard'
import type { PlayerBadgeVitrinaDto } from '@/lib/badges/query'
import { LOSLUNES_SLUG } from '@/lib/org-brand'

type Props = {
  vitrina: PlayerBadgeVitrinaDto
  organizationSlug: string
}

export function BadgeVitrina({ vitrina, organizationSlug }: Props) {
  const kicker =
    organizationSlug === LOSLUNES_SLUG
      ? 'Fútbol de los Lunes · Insignias'
      : `${vitrina.orgName} · Insignias`

  return (
    <section id="insignias-catalogo" className="mx-auto mt-12 max-w-[1040px] scroll-mt-24">
      <header className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#FF6B1A]">{kicker}</p>
        <h2 className="mt-1.5 font-[family-name:var(--font-anton)] text-[34px] uppercase tracking-wide text-white">
          Se ganan en la cancha
        </h2>
        <p className="mx-auto mt-2 max-w-[560px] text-[15px] text-[#888]">
          Reconocimientos automáticos por lo que pasa en el partido. Cada uno cuenta una historia — y
          se comparte en el grupo.
        </p>
        <p className="mt-3 text-sm text-[#888]">
          {vitrina.ganadasDistintas} de {vitrina.totalCatalogo} insignias ganadas por{' '}
          <span className="font-semibold text-white">{vitrina.playerNombre}</span>
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-[0.08em] text-[#777]">
          <span className="inline-flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded-full bg-[#8BA598]" />
            Común
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded-full bg-[#3DE68C]" />
            Raro
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded-full bg-[#FF6B1A]" />
            Épico
          </span>
          <span className="inline-flex items-center gap-2 text-[#E8C878]">
            <i className="inline-block h-3 w-3 rounded-full bg-[#E8C878]" />
            Legendario
          </span>
        </div>
      </header>

      {vitrina.familias.map((section) => (
        <div key={section.family} className="mb-8">
          <h3 className="mb-3.5 flex items-center gap-3 font-[family-name:var(--font-anton)] text-[15px] uppercase tracking-[0.12em] text-[#666]">
            {section.label}
            <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3.5">
            {section.items.map((item) => (
              <BadgeCard
                key={item.predicateId}
                iconKey={item.iconKey}
                name={item.name}
                description={item.description}
                rarity={item.rarity}
                locked={item.locked}
                proximamente={item.proximamente}
                context={item.context}
              />
            ))}
          </div>
        </div>
      ))}

      <p className="mt-10 text-center text-xs font-bold uppercase tracking-[0.18em] text-[#666]">
        {vitrina.totalCatalogo} insignias · 7 familias · Hecho a mano en Puerto Varas ·{' '}
        <b className="text-white">LigaLab</b>
      </p>
    </section>
  )
}
