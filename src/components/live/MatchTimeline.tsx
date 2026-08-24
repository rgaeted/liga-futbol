import { TeamCrest } from '@/components/TeamCrest'

export type TimelineEvent = {
  id: string
  type: string
  minute: number
  playerName: string | null
  teamName: string | null
  teamCrestSrc?: string | null
  teamColor?: string | null
  assistName: string | null
  description?: string | null
}

function isGoalType(type: string) {
  return type === 'GOAL' || type === 'OWN_GOAL'
}

const EVENT_LABELS: Record<string, string> = {
  GOAL: 'Gol',
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

function TimeBadge({ minute }: { minute: number }) {
  return (
    <span className="w-8 shrink-0 rounded-md bg-black/40 px-1 py-1 text-center font-mono text-xs tabular-nums text-white/80 sm:w-9 sm:px-1.5">
      {minute}&apos;
    </span>
  )
}

function TeamBadge({
  name,
  crestSrc,
  color,
}: {
  name: string
  crestSrc?: string | null
  color?: string | null
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <TeamCrest name={name} src={crestSrc} color={color} size="sm" />
      <span className="hidden truncate font-ui text-xs font-semibold uppercase tracking-wide text-white sm:inline sm:text-sm">
        {name}
      </span>
    </span>
  )
}

function TimelineIcon({ type }: { type: string }) {
  switch (type) {
    case 'KICKOFF':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-emerald-400">
            <path d="M4 2.5v11L13 8 4 2.5z" />
          </svg>
        </span>
      )
    case 'GOAL':
    case 'OWN_GOAL':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
          <svg viewBox="0 0 16 16" className="h-4 w-4">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.25" className="text-white" />
            <path
              d="M8 1.5 9.8 5.2 13.8 5.5 10.8 8.1 11.7 12 8 10.1 4.3 12 5.2 8.1 2.2 5.5 6.2 5.2 8 1.5z"
              fill="currentColor"
              className="text-white/90"
            />
          </svg>
        </span>
      )
    case 'HALFTIME':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center gap-0.5" aria-hidden>
          <span className="h-3.5 w-1 rounded-sm bg-amber-400" />
          <span className="h-3.5 w-1 rounded-sm bg-amber-400" />
        </span>
      )
    case 'FULLTIME':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
          <span className="h-3 w-3 rounded-sm bg-kelme-surface/90" />
        </span>
      )
    case 'YELLOW_CARD':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
          <span className="h-4 w-2.5 rounded-sm bg-yellow-400" />
        </span>
      )
    case 'RED_CARD':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
          <span className="h-4 w-2.5 rounded-sm bg-red-500" />
        </span>
      )
    case 'SUBSTITUTION':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs text-sky-400" aria-hidden>
          ⇄
        </span>
      )
    default:
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-kelme-surface/50" />
        </span>
      )
  }
}

function PlayerDetails({
  playerName,
  assistName,
  align = 'right',
}: {
  playerName: string | null
  assistName: string | null
  align?: 'left' | 'center' | 'right'
}) {
  if (!playerName && !assistName) return null

  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'left'
        ? 'text-left'
        : 'text-right'

  return (
    <div className={`min-w-0 font-ui text-sm text-white/70 ${alignClass}`}>
      {playerName && <p className="truncate">{playerName}</p>}
      {assistName && (
        <p className="truncate text-xs text-white/40">Asistencia: {assistName}</p>
      )}
    </div>
  )
}

function GoalWithDescriptionRow({ event, label }: { event: TimelineEvent; label: string }) {
  return (
    <li className="border-b border-white/5 px-3 py-3.5 last:border-b-0 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <TimeBadge minute={event.minute} />
        <TimelineIcon type={event.type} />
        <span className="shrink-0 font-ui text-sm text-white/90">{label}</span>
        <span className="min-w-0 flex-1" />
        {event.teamName && (
          <TeamBadge
            name={event.teamName}
            crestSrc={event.teamCrestSrc}
            color={event.teamColor}
          />
        )}
      </div>

      <p className="mt-2.5 text-center font-display text-[0.8125rem] font-semibold leading-snug italic text-amber-200/90 sm:text-base">
        &ldquo;{event.description}&rdquo;
      </p>

      {(event.playerName || event.assistName) && (
        <div className="mt-1.5">
          <PlayerDetails
            playerName={event.playerName}
            assistName={event.assistName}
            align="center"
          />
        </div>
      )}
    </li>
  )
}

function CompactTimelineRow({ event, label }: { event: TimelineEvent; label: string }) {
  const showLabelOnMobile = event.type === 'KICKOFF' || event.type === 'HALFTIME' || event.type === 'FULLTIME'

  return (
    <li className="flex items-center gap-2 border-b border-white/5 px-3 py-3 last:border-b-0 sm:gap-3 sm:px-4">
      <TimeBadge minute={event.minute} />
      <TimelineIcon type={event.type} />

      <span
        className={`shrink-0 font-ui text-sm text-white/90 ${showLabelOnMobile ? '' : 'hidden sm:inline'}`}
      >
        {label}
      </span>

      <span className="min-w-0 flex-1" />

      {(event.playerName || event.assistName) && (
        <PlayerDetails playerName={event.playerName} assistName={event.assistName} align="right" />
      )}

      {event.teamName && (
        <TeamBadge
          name={event.teamName}
          crestSrc={event.teamCrestSrc}
          color={event.teamColor}
        />
      )}
    </li>
  )
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const label = eventLabel(event.type)
  const goalQuote = isGoalType(event.type) && event.description

  if (goalQuote) {
    return <GoalWithDescriptionRow event={event} label={label} />
  }

  return <CompactTimelineRow event={event} label={label} />
}

export function MatchTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.25em] text-amber-200/75">
          Cronología
        </h2>
        <div className="rounded-xl border border-white/10 bg-kelme-live-surface px-4 py-8 text-center font-ui text-sm text-white/40">
          Aún no hay eventos en este partido.
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.25em] text-amber-200/75">
        Cronología
      </h2>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-kelme-live-surface">
        <ul>
          {events.map((event) => (
            <TimelineRow key={event.id} event={event} />
          ))}
        </ul>
      </div>
    </section>
  )
}
