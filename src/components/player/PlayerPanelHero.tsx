import Link from 'next/link'
import type { PlayerCardDto } from '@/lib/player-card-query'
import type { PlayerMatchResults } from '@/lib/player-match-results'
import type { FormResult } from '@/lib/player-form-streak'
import { personInitials } from '@/lib/player-name'
import { orgPath } from '@/lib/tenant-paths'

type Props = {
  organizationSlug: string
  playerId: string
  firstName: string
  lastName: string
  teamName: string | null
  position: string | null
  photoUrl: string | null
  playedCount: number
  results: PlayerMatchResults
  form: FormResult[]
  card: PlayerCardDto | null
  showBadgesLink: boolean
  showCardLink: boolean
  cardEmbedded?: boolean
  badgesEmbedded?: boolean
}

const FORM_LABELS: Record<FormResult, string> = { W: 'V', D: 'E', L: 'D' }

const FORM_STYLES: Record<FormResult, string> = {
  W: 'border-[#3DE68C]/40 bg-[#3DE68C]/15 text-[#3DE68C]',
  D: 'border-[#8BA598]/40 bg-[#8BA598]/15 text-[#8BA598]',
  L: 'border-[#E06055]/40 bg-[#E06055]/15 text-[#E06055]',
}

export function PlayerPanelHero({
  organizationSlug,
  playerId,
  firstName,
  lastName,
  teamName,
  position,
  photoUrl,
  playedCount,
  form,
  card,
  showBadgesLink,
  showCardLink,
  cardEmbedded = false,
  badgesEmbedded = false,
}: Props) {
  const displayPosition = card?.player.posicion ?? position ?? '—'
  const initials = personInitials(`${firstName} ${lastName}`)

  return (
    <section className="rounded-2xl border border-[#2A3A32] bg-[#121A18] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4 sm:gap-5">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative h-[88px] w-[88px] overflow-hidden rounded-2xl bg-[#C91F26] shadow-[0_8px_24px_rgba(201,31,38,0.35)]">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-[family-name:var(--font-anton)] text-4xl text-[#E8E4D8]">
                  {initials.slice(0, 1)}
                </span>
              )}
            </div>
            {displayPosition !== '—' ? (
              <span className="rounded-md border border-[#C91F26]/30 bg-[#0B1210] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#C91F26]">
                {displayPosition}
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide text-[#E8E4D8]">
              {firstName}
            </h1>
            <p className="mt-1 text-sm text-[#8A938C]">
              {teamName ?? 'Sin equipo'} · {playedCount}{' '}
              {playedCount === 1 ? 'partido' : 'partidos'}
            </p>

            {form.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A938C]">
                  Forma
                </span>
                {form.map((result, index) => (
                  <span
                    key={`${result}-${index}`}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${FORM_STYLES[result]}`}
                    title={result === 'W' ? 'Victoria' : result === 'D' ? 'Empate' : 'Derrota'}
                  >
                    {FORM_LABELS[result]}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          {showCardLink ? (
            cardEmbedded ? (
              <a
                href="#mi-carta"
                className="rounded-lg bg-[#C91F26] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#E8E4D8] transition hover:bg-[#9A181E]"
              >
                Ver mi carta
              </a>
            ) : (
              <Link
                href={orgPath(organizationSlug, `/jugador/${playerId}?from=player`)}
                className="rounded-lg bg-[#C91F26] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#E8E4D8] transition hover:bg-[#9A181E]"
              >
                Ver mi carta
              </Link>
            )
          ) : null}
          {showBadgesLink ? (
            badgesEmbedded ? (
              <a
                href="#mis-insignias"
                className="rounded-lg border border-[#2A3A32] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#E8E4D8] transition hover:border-[#8A938C]"
              >
                Mis insignias
              </a>
            ) : (
              <Link
                href={orgPath(organizationSlug, `/jugador/${playerId}?from=player`)}
                className="rounded-lg border border-[#2A3A32] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#E8E4D8] transition hover:border-[#8A938C]"
              >
                Mis insignias
              </Link>
            )
          ) : null}
          <Link
            href={orgPath(organizationSlug, '/player/profile')}
            className="px-2 py-2 text-xs font-semibold text-[#8A938C] transition hover:text-[#E8E4D8]"
          >
            Mi perfil →
          </Link>
        </div>
      </div>
    </section>
  )
}
