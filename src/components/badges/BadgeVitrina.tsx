import { BadgeDisco, badgeCardClasses, badgeRarityLabel } from '@/components/badges/BadgeDisco'
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
    <section className="mx-auto mt-12 max-w-[1040px]">
      <header className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#3DE68C]">{kicker}</p>
        <h2 className="mt-1.5 font-[family-name:var(--font-anton)] text-[34px] uppercase tracking-wide">
          Se ganan en la cancha
        </h2>
        <p className="mx-auto mt-2 max-w-[560px] text-[15px] text-[#8BA598]">
          Reconocimientos automáticos por lo que pasa en el partido. Cada uno cuenta una historia — y
          se comparte en el grupo.
        </p>
        <p className="mt-3 text-sm text-[#8BA598]">
          {vitrina.ganadasDistintas} de {vitrina.totalCatalogo} insignias ganadas por{' '}
          <span className="font-semibold text-[#EDF2EE]">{vitrina.playerNombre}</span>
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-[0.08em] text-[#8BA598]">
          <span className="inline-flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded-[3px] bg-[#2C4438]" />
            Común
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded-[3px] bg-[#3DE68C]" />
            Raro
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded-[3px] bg-[#E8C878]" />
            Épico
          </span>
          <span
            className="inline-flex items-center gap-2"
            style={{
              background:
                'conic-gradient(from 210deg, #C79A3E, #E8C878, #FFF3D0, #E8C878)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            <i
              className="inline-block h-3 w-3 rounded-[3px]"
              style={{
                background:
                  'conic-gradient(from 210deg, #C79A3E, #E8C878, #FFF3D0, #E8C878)',
              }}
            />
            Legendario
          </span>
        </div>
      </header>

      {vitrina.familias.map((section) => (
        <div key={section.family} className="mb-8">
          <h3 className="mb-3.5 flex items-center gap-3 font-[family-name:var(--font-anton)] text-[15px] uppercase tracking-[0.12em] text-[#8BA598]">
            {section.label}
            <span className="h-px flex-1 bg-gradient-to-r from-[#22382E] to-transparent" />
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-3.5">
            {section.items.map((item) => (
              <article
                key={item.predicateId}
                className={`relative overflow-hidden rounded-2xl px-3.5 pb-3.5 pt-4 text-center transition-transform hover:-translate-y-0.5 ${badgeCardClasses(item.rarity, item.locked, item.proximamente)}`}
              >
                <span className="absolute right-2.5 top-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#8BA598] opacity-70">
                  {item.proximamente ? 'Próximamente' : badgeRarityLabel(item.rarity)}
                </span>
                <BadgeDisco
                  rarity={item.rarity}
                  iconKey={item.iconKey}
                  locked={item.locked}
                  className="mx-auto mb-2.5"
                />
                <b className="block font-[family-name:var(--font-anton)] text-[15px] uppercase leading-tight tracking-[0.03em]">
                  {item.name}
                </b>
                <p className="mt-1 min-h-8 text-xs text-[#8BA598]">{item.description}</p>
                {item.proximamente ? (
                  <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#8BA598]">
                    Próximamente
                  </div>
                ) : item.context ? (
                  <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#3DE68C]">
                    {item.context}
                  </div>
                ) : item.locked ? (
                  <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#8BA598]">
                    Bloqueada
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ))}

      <p className="mt-10 text-center text-xs font-bold uppercase tracking-[0.18em] text-[#8BA598]">
        {vitrina.totalCatalogo} insignias · 7 familias · Hecho a mano en Puerto Varas ·{' '}
        <b className="text-[#EDF2EE]">LigaLab</b>
      </p>
    </section>
  )
}
