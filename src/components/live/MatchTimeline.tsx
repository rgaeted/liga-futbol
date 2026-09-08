import { TeamCrest } from '@/components/TeamCrest'
import { LOSLUNES_HERO_PATH, LOSLUNES_LOGO_PATH, LOSLUNES_SLUG } from '@/lib/org-brand'
import { personInitials } from '@/lib/player-name'

export type TimelineEvent = {
  id: string
  type: string
  minute: number
  playerName: string | null
  playerId?: string | null
  playerPhotoUrl?: string | null
  teamName: string | null
  teamCrestSrc?: string | null
  teamColor?: string | null
  assistName: string | null
  assistPhotoUrl?: string | null
  description?: string | null
  scoreAfter?: string | null
}

export type MatchTimelineTeams = {
  home: { name: string; crestSrc: string | null; color: string }
  away: { name: string; crestSrc: string | null; color: string }
}

function isGoalType(type: string) {
  return type === 'GOAL' || type === 'PENALTY_GOAL' || type === 'OWN_GOAL'
}

const EVENT_LABELS: Record<string, string> = {
  GOAL: 'Gol',
  PENALTY_GOAL: 'Gol de penal',
  MISSED_PENALTY: 'Penal perdido',
  OWN_GOAL: 'Gol en contra',
  YELLOW_CARD: 'Tarjeta amarilla',
  RED_CARD: 'Tarjeta roja',
  SHOT_ON_TARGET: 'Tiro al arco',
  SHOT_OFF_TARGET: 'Tiro desviado',
  SUBSTITUTION: 'Cambio',
  FOUL: 'Falta',
  KICKOFF: 'Inicio del partido',
  HALFTIME: 'Entretiempo',
  FULLTIME: 'Final del partido',
}

function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type
}

function formatScoreDisplay(scoreAfter: string): string {
  const [home, away] = scoreAfter.split('-')
  if (home === undefined || away === undefined) return scoreAfter
  return `${home} - ${away}`
}

function resolveEventSide(
  event: TimelineEvent,
  homeName: string,
  awayName: string,
  kickoffCount: number,
): 'left' | 'right' {
  if (event.teamName === homeName) return 'left'
  if (event.teamName === awayName) return 'right'
  if (event.type === 'KICKOFF') return kickoffCount <= 1 ? 'left' : 'right'
  if (event.type === 'HALFTIME') return 'left'
  if (event.type === 'FULLTIME') return 'right'
  return 'left'
}

function AxisNode({ type }: { type: string }) {
  const base =
    'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10'

  switch (type) {
    case 'KICKOFF':
      return (
        <span className={`${base} border-emerald-500/70 bg-[#0a1210]`} aria-hidden>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-emerald-400">
            <path d="M4 2.5v11L13 8 4 2.5z" />
          </svg>
        </span>
      )
    case 'GOAL':
    case 'PENALTY_GOAL':
    case 'OWN_GOAL':
      return (
        <span className={`${base} border-org-primary bg-[#141010] shadow-[0_0_16px_rgba(245,127,32,0.45)]`} aria-hidden>
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-white">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <path
              d="M8 2.2 9.4 5.1 12.6 5.3 10.2 7.3 11 10.4 8 8.8 5 10.4 5.8 7.3 3.4 5.3 6.6 5.1 8 2.2z"
              fill="currentColor"
            />
          </svg>
        </span>
      )
    case 'HALFTIME':
      return (
        <span className={`${base} border-amber-500/60 bg-[#121010]`} aria-hidden>
          <span className="flex gap-0.5">
            <span className="h-3.5 w-1 rounded-sm bg-amber-400" />
            <span className="h-3.5 w-1 rounded-sm bg-amber-400" />
          </span>
        </span>
      )
    case 'FULLTIME':
      return (
        <span className={`${base} border-white/25 bg-[#121010]`} aria-hidden>
          <span className="h-3 w-3 rounded-sm bg-white/70" />
        </span>
      )
    case 'SUBSTITUTION':
      return (
        <span className={`${base} border-sky-500/50 bg-[#101418]`} aria-hidden>
          <span className="text-sm font-bold text-sky-400">⇄</span>
        </span>
      )
    case 'YELLOW_CARD':
      return (
        <span className={`${base} border-yellow-500/50 bg-[#121010]`} aria-hidden>
          <span className="h-4 w-2.5 rounded-sm bg-yellow-400" />
        </span>
      )
    case 'RED_CARD':
      return (
        <span className={`${base} border-red-500/50 bg-[#121010]`} aria-hidden>
          <span className="h-4 w-2.5 rounded-sm bg-red-500" />
        </span>
      )
    default:
      return (
        <span className={`${base} border-white/20 bg-[#121010]`} aria-hidden>
          <span className="h-2 w-2 rounded-full bg-white/40" />
        </span>
      )
  }
}

function MinuteOnAxis({ minute }: { minute: number }) {
  return (
    <span className="mb-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-white/85 sm:text-[11px]">
      {minute}&apos;
    </span>
  )
}

function PlayerActorAvatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md'
}) {
  const box = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12 sm:h-14 sm:w-14'
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs sm:text-sm'

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1a1a1a] ring-2 ring-white/15 ${box}`}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={`font-display font-bold text-white/70 ${text}`}>{personInitials(name)}</span>
      )}
    </div>
  )
}

function AssistLine({
  name,
  photoUrl,
}: {
  name: string
  photoUrl?: string | null
}) {
  return (
    <div className="mt-1 flex min-w-0 items-center gap-2">
      {photoUrl ? (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1a1a1a] ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">Asist.</p>
        <p className="truncate text-xs text-white/60">{name}</p>
      </div>
    </div>
  )
}

function EventPlayerColumn({ event }: { event: TimelineEvent }) {
  if (!event.playerName) return null
  return (
    <PlayerActorAvatar name={event.playerName} photoUrl={event.playerPhotoUrl} />
  )
}

function GoalCard({ event, label }: { event: TimelineEvent; label: string }) {
  const quote = isGoalType(event.type) && event.description

  return (
    <article className="relative overflow-hidden rounded-xl border border-org-primary bg-[#0c0c0c] shadow-[0_0_28px_rgba(245,127,32,0.22)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 50%, rgba(245,127,32,0.18), transparent 42%),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 22px),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 22px)
          `,
        }}
        aria-hidden
      />
      <div className="relative grid grid-cols-[1fr_auto] items-stretch gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4 sm:p-4">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-org-primary sm:text-base">
            {label}
          </p>
          {event.playerName ? (
            <p className="mt-1 truncate font-ui text-sm font-semibold text-white sm:text-base">
              {event.playerName}
            </p>
          ) : null}
          {event.assistName ? (
            <AssistLine name={event.assistName} photoUrl={event.assistPhotoUrl} />
          ) : null}
          {quote ? (
            <p className="mt-2 font-display text-xs italic leading-snug text-amber-100/80 sm:text-sm">
              &ldquo;{event.description}&rdquo;
            </p>
          ) : null}
        </div>

        {event.scoreAfter ? (
          <div className="flex items-center justify-center px-1 sm:px-3">
            <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-[#f5c842] sm:text-4xl">
              {formatScoreDisplay(event.scoreAfter)}
            </span>
          </div>
        ) : null}

        {event.playerName ? (
          <div className="col-span-2 flex justify-end sm:col-span-1 sm:justify-center">
            <EventPlayerColumn event={event} />
          </div>
        ) : null}
      </div>
    </article>
  )
}

function MilestoneCard({
  event,
  label,
  side,
  showHalftimePhoto,
}: {
  event: TimelineEvent
  label: string
  side: 'left' | 'right'
  showHalftimePhoto?: boolean
}) {
  return (
    <article
      className={`overflow-hidden rounded-xl border border-white/12 bg-[#101010]/95 ${
        side === 'left' ? 'sm:mr-2' : 'sm:ml-2'
      }`}
    >
      <div className="flex items-stretch gap-0">
        {showHalftimePhoto && event.type === 'HALFTIME' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={LOSLUNES_HERO_PATH}
            alt=""
            className="hidden w-24 shrink-0 object-cover sm:block sm:w-28"
          />
        ) : null}
        <div className="flex flex-1 items-center gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white sm:text-sm">
            {label}
          </p>
          {event.description ? (
            <p className="mt-1 text-xs leading-snug text-white/55 sm:text-sm">{event.description}</p>
          ) : event.type === 'KICKOFF' ? (
            <p className="mt-1 text-xs text-white/45 sm:text-sm">¡Ya se juega en la cancha!</p>
          ) : null}
        </div>
        </div>
      </div>
    </article>
  )
}

function CompactCard({ event, label }: { event: TimelineEvent; label: string }) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#101010]/90 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/90 sm:text-xs">
            {label}
          </p>
          {event.playerName ? (
            <p className="mt-0.5 truncate font-ui text-sm text-white/75">{event.playerName}</p>
          ) : null}
          {event.assistName ? (
            <AssistLine name={event.assistName} photoUrl={event.assistPhotoUrl} />
          ) : null}
        </div>
        {event.playerName ? <EventPlayerColumn event={event} /> : null}
      </div>
    </article>
  )
}

function TimelineEventCard({
  event,
  label,
  side,
  showHalftimePhoto,
}: {
  event: TimelineEvent
  label: string
  side: 'left' | 'right'
  showHalftimePhoto?: boolean
}) {
  if (isGoalType(event.type)) {
    return <GoalCard event={event} label={label} />
  }
  if (event.type === 'KICKOFF' || event.type === 'HALFTIME' || event.type === 'FULLTIME') {
    return (
      <MilestoneCard
        event={event}
        label={label}
        side={side}
        showHalftimePhoto={showHalftimePhoto}
      />
    )
  }
  return <CompactCard event={event} label={label} />
}

function SideWatermark({
  name,
  crestSrc,
  color,
  align,
}: {
  name: string
  crestSrc: string | null
  color: string
  align: 'left' | 'right'
}) {
  return (
    <div
      className={`pointer-events-none absolute top-8 hidden select-none opacity-[0.07] lg:block ${
        align === 'left' ? 'left-0' : 'right-0'
      }`}
      aria-hidden
    >
      <div
        className={`flex flex-col items-center gap-4 ${align === 'left' ? 'pl-2' : 'pr-2'}`}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        <span className="font-display text-5xl font-bold uppercase tracking-[0.2em] text-white xl:text-6xl">
          {name}
        </span>
        <div className="h-16 w-16 rotate-90 opacity-80">
          <TeamCrest name={name} src={crestSrc} color={color} size="lg" fit="contain" className="!h-full !w-full" />
        </div>
      </div>
    </div>
  )
}

function TimelineRow({
  event,
  side,
  label,
  showHalftimePhoto,
}: {
  event: TimelineEvent
  side: 'left' | 'right'
  label: string
  showHalftimePhoto?: boolean
}) {
  const connector =
    side === 'left'
      ? 'right-1/2 mr-[22px] w-[calc(50%-22px)]'
      : 'left-1/2 ml-[22px] w-[calc(50%-22px)]'

  const card = (
    <TimelineEventCard
      event={event}
      label={label}
      side={side}
      showHalftimePhoto={showHalftimePhoto}
    />
  )

  return (
    <li className="relative py-3 sm:py-4">
      <div
        className={`absolute top-1/2 hidden h-px -translate-y-1/2 bg-white/15 sm:block ${connector}`}
        aria-hidden
      />

      <div className="hidden grid-cols-[1fr_44px_1fr] items-center gap-3 sm:grid">
        <div className="min-w-0">{side === 'left' ? card : null}</div>
        <div className="flex flex-col items-center justify-center">
          <MinuteOnAxis minute={event.minute} />
          <AxisNode type={event.type} />
        </div>
        <div className="min-w-0">{side === 'right' ? card : null}</div>
      </div>

      <div className="grid grid-cols-[40px_1fr] items-start gap-3 sm:hidden">
        <div className="flex flex-col items-center">
          <MinuteOnAxis minute={event.minute} />
          <AxisNode type={event.type} />
        </div>
        <div className="min-w-0 pt-1">{card}</div>
      </div>
    </li>
  )
}

export function MatchTimeline({
  events,
  teams,
  organizationSlug,
}: {
  events: TimelineEvent[]
  teams: MatchTimelineTeams
  organizationSlug?: string
}) {
  const isLosLunes = organizationSlug === LOSLUNES_SLUG
  let kickoffCount = 0

  if (events.length === 0) {
    return (
      <section className="relative">
        <TimelineHeader isLosLunes={isLosLunes} />
        <div className="rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-10 text-center font-ui text-sm text-white/40">
          Aún no hay eventos en este partido.
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#050505] px-3 py-6 sm:px-6 sm:py-8">
      <SideWatermark
        name={teams.home.name}
        crestSrc={teams.home.crestSrc}
        color={teams.home.color}
        align="left"
      />
      <SideWatermark
        name={teams.away.name}
        crestSrc={teams.away.crestSrc}
        color={teams.away.color}
        align="right"
      />

      <TimelineHeader isLosLunes={isLosLunes} />

      <div className="relative mx-auto max-w-4xl">
        <div
          className="absolute bottom-4 left-1/2 top-4 w-px -translate-x-1/2 bg-gradient-to-b from-white/5 via-white/20 to-white/5"
          aria-hidden
        />

        <ul className="relative">
          {events.map((event) => {
            if (event.type === 'KICKOFF') kickoffCount += 1
            const side = resolveEventSide(
              event,
              teams.home.name,
              teams.away.name,
              kickoffCount,
            )
            const label = eventLabel(event.type)
            return (
              <TimelineRow
                key={event.id}
                event={event}
                side={side}
                label={label}
                showHalftimePhoto={isLosLunes}
              />
            )
          })}
        </ul>
      </div>

      {isLosLunes ? <TimelineFooterLosLunes /> : null}
    </section>
  )
}

function TimelineHeader({ isLosLunes }: { isLosLunes: boolean }) {
  return (
    <div className="relative z-10 mb-6 flex items-end justify-between gap-4 px-1">
      <h2 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white sm:text-2xl">
        Cronología
      </h2>
      {isLosLunes ? (
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35 sm:block">
          Fútbol · Pasión · Siempre
        </p>
      ) : null}
    </div>
  )
}

function TimelineFooterLosLunes() {
  return (
    <div className="relative z-10 mt-8 flex items-end justify-between gap-4 border-t border-white/[0.06] px-1 pt-5">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 sm:text-xs">
        Más que un partido
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOSLUNES_LOGO_PATH} alt="" className="h-8 w-8 object-contain opacity-90 sm:h-9 sm:w-9" />
    </div>
  )
}
