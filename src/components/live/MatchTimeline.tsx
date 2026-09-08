import { TeamCrest } from '@/components/TeamCrest'
import {
  LosLunesFlankedTitle,
  LosLunesGoldDivider,
  LosLunesLocationPill,
  LosLunesPhotoRing,
  LosLunesStatusLine,
  losLunesLiveCard,
} from '@/components/live/loslunes-live-ui'
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

function AxisNode({ type, premium }: { type: string; premium: boolean }) {
  const base =
    'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10'
  const goalRing = premium
    ? 'border-amber-300/70 bg-[#0a0806] shadow-[0_0_18px_rgba(245,200,66,0.45)]'
    : 'border-org-primary bg-[#141010] shadow-[0_0_16px_rgba(245,127,32,0.45)]'

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
        <span className={`${base} ${goalRing}`} aria-hidden>
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-amber-100">
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

function MinuteOnAxis({ minute, premium }: { minute: number; premium: boolean }) {
  return (
    <span
      className={`mb-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums sm:text-[11px] ${
        premium
          ? 'bg-black/80 text-amber-100/90 ring-1 ring-amber-400/25'
          : 'bg-black/70 text-white/85'
      }`}
    >
      {minute}&apos;
    </span>
  )
}

function PlayerActorAvatar({
  name,
  photoUrl,
  size = 'md',
  premium = false,
}: {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  premium?: boolean
}) {
  if (premium && size !== 'sm') {
    return (
      <LosLunesPhotoRing
        name={name}
        photoUrl={photoUrl}
        size={size === 'lg' ? 'lg' : 'md'}
      />
    )
  }

  const box =
    size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]' : 'h-12 w-12 sm:h-14 sm:w-14'
  const text =
    size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'

  return (
    <div className={`shrink-0 overflow-hidden rounded-full ${box}`}>
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#141010] ring-2 ring-white/15">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={`font-display font-bold text-white/75 ${text}`}>{personInitials(name)}</span>
        )}
      </div>
    </div>
  )
}

function AssistLine({
  name,
  photoUrl,
  premium = false,
}: {
  name: string
  photoUrl?: string | null
  premium?: boolean
}) {
  if (premium) {
    return (
      <div className="mt-1.5 flex min-w-0 items-center gap-2">
        {photoUrl ? (
          <div className="shrink-0 rounded-full bg-gradient-to-br from-amber-200/70 to-amber-600/30 p-px">
            <div className="h-5 w-5 overflow-hidden rounded-full bg-[#141010]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        ) : null}
        <p className="min-w-0 truncate text-xs text-white/55">
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-400/55">
            Asist.
          </span>{' '}
          <span className="font-display text-sm text-white/80">{name}</span>
        </p>
      </div>
    )
  }

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

function cardShell(premium: boolean, extra = '') {
  return premium
    ? `${losLunesLiveCard} ${extra}`
    : `overflow-hidden rounded-xl border border-white/10 bg-[#101010]/90 ${extra}`
}

function GoalCard({
  event,
  label,
  premium,
}: {
  event: TimelineEvent
  label: string
  premium: boolean
}) {
  const quote = isGoalType(event.type) && event.description

  if (premium) {
    return (
      <article className={cardShell(true, 'relative border-org-primary/40')}>
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              radial-gradient(circle at 12% 40%, rgba(245,200,66,0.16), transparent 45%),
              repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 20px),
              repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 20px)
            `,
          }}
          aria-hidden
        />
        <div className="relative flex items-stretch gap-3 p-3 sm:gap-4 sm:p-4">
          {event.playerName ? (
            <PlayerActorAvatar
              name={event.playerName}
              photoUrl={event.playerPhotoUrl}
              size="lg"
              premium
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
              {label}
            </p>
            {event.playerName ? (
              <p className="mt-0.5 truncate font-display text-lg font-bold leading-tight text-white sm:text-xl">
                {event.playerName}
              </p>
            ) : null}
            {event.assistName ? (
              <AssistLine name={event.assistName} photoUrl={event.assistPhotoUrl} premium />
            ) : null}
            {quote ? (
              <p className="mt-2 font-display text-xs italic leading-snug text-amber-100/70 sm:text-sm">
                &ldquo;{event.description}&rdquo;
              </p>
            ) : null}
          </div>
          {event.scoreAfter ? (
            <div className="flex shrink-0 items-center self-center px-1">
              <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-[#f5c842] drop-shadow-[0_0_18px_rgba(245,200,66,0.45)] sm:text-4xl">
                {formatScoreDisplay(event.scoreAfter)}
              </span>
            </div>
          ) : null}
        </div>
      </article>
    )
  }

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
      <div className="relative flex items-stretch gap-3 p-3 sm:gap-4 sm:p-4">
        {event.playerName ? (
          <PlayerActorAvatar name={event.playerName} photoUrl={event.playerPhotoUrl} size="lg" />
        ) : null}
        <div className="min-w-0 flex-1">
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
          <div className="flex shrink-0 items-center self-center px-1">
            <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-[#f5c842] sm:text-4xl">
              {formatScoreDisplay(event.scoreAfter)}
            </span>
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
  premium,
}: {
  event: TimelineEvent
  label: string
  side: 'left' | 'right'
  showHalftimePhoto?: boolean
  premium: boolean
}) {
  return (
    <article className={cardShell(premium, side === 'left' ? 'sm:mr-2' : 'sm:ml-2')}>
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
            <p
              className={`font-display text-xs font-bold uppercase tracking-[0.16em] sm:text-sm ${
                premium ? 'text-amber-100/90' : 'text-white'
              }`}
            >
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

function CompactCard({
  event,
  label,
  premium,
}: {
  event: TimelineEvent
  label: string
  premium: boolean
}) {
  return (
    <article className={cardShell(premium, 'px-3 py-2.5 sm:px-4 sm:py-3')}>
      <div className="flex items-center gap-3">
        {event.playerName ? (
          <PlayerActorAvatar
            name={event.playerName}
            photoUrl={event.playerPhotoUrl}
            size={premium ? 'md' : 'sm'}
            premium={premium}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className={`font-display text-[11px] font-bold uppercase tracking-[0.14em] sm:text-xs ${
              premium ? 'text-amber-400/75' : 'text-white/90'
            }`}
          >
            {label}
          </p>
          {event.playerName ? (
            <p
              className={`mt-0.5 truncate ${
                premium
                  ? 'font-display text-base font-semibold text-white'
                  : 'font-ui text-sm text-white/75'
              }`}
            >
              {event.playerName}
            </p>
          ) : null}
          {event.assistName ? (
            <AssistLine name={event.assistName} photoUrl={event.assistPhotoUrl} premium={premium} />
          ) : null}
        </div>
      </div>
    </article>
  )
}

function TimelineEventCard({
  event,
  label,
  side,
  showHalftimePhoto,
  premium,
}: {
  event: TimelineEvent
  label: string
  side: 'left' | 'right'
  showHalftimePhoto?: boolean
  premium: boolean
}) {
  if (isGoalType(event.type)) {
    return <GoalCard event={event} label={label} premium={premium} />
  }
  if (event.type === 'KICKOFF' || event.type === 'HALFTIME' || event.type === 'FULLTIME') {
    return (
      <MilestoneCard
        event={event}
        label={label}
        side={side}
        showHalftimePhoto={showHalftimePhoto}
        premium={premium}
      />
    )
  }
  return <CompactCard event={event} label={label} premium={premium} />
}

function SideWatermark({
  name,
  crestSrc,
  color,
  align,
  premium,
}: {
  name: string
  crestSrc: string | null
  color: string
  align: 'left' | 'right'
  premium: boolean
}) {
  return (
    <div
      className={`pointer-events-none absolute top-12 hidden select-none lg:block ${
        premium ? 'opacity-[0.05]' : 'opacity-[0.07]'
      } ${align === 'left' ? 'left-0' : 'right-0'}`}
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
  premium,
}: {
  event: TimelineEvent
  side: 'left' | 'right'
  label: string
  showHalftimePhoto?: boolean
  premium: boolean
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
      premium={premium}
    />
  )

  const spineClass = premium
    ? 'bg-gradient-to-b from-amber-400/5 via-amber-300/25 to-amber-400/5'
    : 'bg-gradient-to-b from-white/5 via-white/20 to-white/5'

  return (
    <li className="relative py-3 sm:py-4">
      <div
        className={`absolute top-1/2 hidden h-px -translate-y-1/2 sm:block ${
          premium ? 'bg-amber-400/20' : 'bg-white/15'
        } ${connector}`}
        aria-hidden
      />

      <div className="hidden grid-cols-[1fr_44px_1fr] items-center gap-3 sm:grid">
        <div className="min-w-0">{side === 'left' ? card : null}</div>
        <div className="flex flex-col items-center justify-center">
          <MinuteOnAxis minute={event.minute} premium={premium} />
          <AxisNode type={event.type} premium={premium} />
        </div>
        <div className="min-w-0">{side === 'right' ? card : null}</div>
      </div>

      <div className="grid grid-cols-[40px_1fr] items-start gap-3 sm:hidden">
        <div className="flex flex-col items-center">
          <MinuteOnAxis minute={event.minute} premium={premium} />
          <AxisNode type={event.type} premium={premium} />
        </div>
        <div className="min-w-0 pt-1">{card}</div>
      </div>

      <span className={`absolute bottom-0 left-1/2 top-0 -z-10 w-px -translate-x-1/2 ${spineClass} sm:hidden`} aria-hidden />
    </li>
  )
}

export type MatchTimelineHeader = {
  status: string
  isLive?: boolean
  venueLabel?: string | null
  homeName?: string
  awayName?: string
  homeScore?: number
  awayScore?: number
  homeCrestSrc?: string | null
  awayCrestSrc?: string | null
  homeColor?: string
  awayColor?: string
}

export function MatchTimeline({
  events,
  teams,
  organizationSlug,
  embedded = false,
  header,
}: {
  events: TimelineEvent[]
  teams: MatchTimelineTeams
  organizationSlug?: string
  embedded?: boolean
  header?: MatchTimelineHeader
}) {
  const premium = organizationSlug === LOSLUNES_SLUG
  const unifiedPremium = premium && embedded
  let kickoffCount = 0

  const bodyShell = unifiedPremium
    ? `${losLunesLiveCard} relative p-5 sm:p-6`
    : premium
      ? 'overflow-hidden rounded-2xl border border-amber-400/25 bg-[#050403] px-3 py-6 sm:px-6 sm:py-8'
      : 'relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#050505] px-3 py-6 sm:px-6 sm:py-8'

  const emptyState = (
    <div
      className={`rounded-xl px-4 py-10 text-center font-ui text-sm text-white/40 ${
        premium ? 'border border-amber-400/20 bg-black/50' : 'border border-white/10 bg-[#0a0a0a]'
      }`}
    >
      Aún no hay eventos en este partido.
    </div>
  )

  const timelineList =
    events.length === 0 ? (
      emptyState
    ) : (
      <>
        <SideWatermark
          name={teams.home.name}
          crestSrc={teams.home.crestSrc}
          color={teams.home.color}
          align="left"
          premium={premium}
        />
        <SideWatermark
          name={teams.away.name}
          crestSrc={teams.away.crestSrc}
          color={teams.away.color}
          align="right"
          premium={premium}
        />
        <div className="relative mx-auto max-w-4xl">
          <div
            className={`absolute bottom-4 left-1/2 top-4 w-px -translate-x-1/2 ${
              premium
                ? 'bg-gradient-to-b from-amber-400/5 via-amber-300/30 to-amber-400/5'
                : 'bg-gradient-to-b from-white/5 via-white/20 to-white/5'
            }`}
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
                  showHalftimePhoto={premium}
                  premium={premium}
                />
              )
            })}
          </ul>
        </div>
      </>
    )

  if (unifiedPremium) {
    return (
      <section className="relative">
        <TimelineHeader premium header={header} />
        <div className={bodyShell}>{timelineList}</div>
      </section>
    )
  }

  return (
    <section className={`relative ${bodyShell}`}>
      {premium ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOSLUNES_HERO_PATH}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/90"
            aria-hidden
          />
          <p
            className="pointer-events-none absolute bottom-6 left-4 hidden font-display text-4xl font-bold uppercase tracking-[0.08em] text-white/[0.03] sm:block xl:text-5xl"
            aria-hidden
          >
            Los lunes también se juega
          </p>
        </>
      ) : null}

      <TimelineHeader premium={premium} header={header} />
      {timelineList}
      {premium ? <TimelineFooterLosLunes /> : null}
    </section>
  )
}

function TimelineHeader({
  premium,
  header,
}: {
  premium: boolean
  header?: MatchTimelineHeader
}) {
  if (premium) {
    const score =
      header?.homeName &&
      header.awayName &&
      header.homeScore != null &&
      header.awayScore != null
        ? {
            homeName: header.homeName,
            awayName: header.awayName,
            homeScore: header.homeScore,
            awayScore: header.awayScore,
            homeCrestSrc: header.homeCrestSrc,
            awayCrestSrc: header.awayCrestSrc,
            homeColor: header.homeColor,
            awayColor: header.awayColor,
          }
        : null

    return (
      <div className="relative z-10 mb-8 px-1 text-center">
        <LosLunesFlankedTitle size="hero">Cronología</LosLunesFlankedTitle>
        {header?.status ? (
          <div className="mt-2">
            <LosLunesStatusLine status={header.status} isLive={header.isLive} />
          </div>
        ) : null}
        {header?.venueLabel ? (
          <div className="mt-4">
            <LosLunesLocationPill label={header.venueLabel} />
          </div>
        ) : null}
        {score ? (
          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <div className="flex min-w-0 flex-col items-center text-center">
              <div className="mb-2 rounded-full bg-gradient-to-br from-[#fff1b0] via-[#d4af37] to-[#8a6414] p-[2px] shadow-[0_0_18px_rgba(212,175,55,0.35)]">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#141010] sm:h-16 sm:w-16">
                  <TeamCrest
                    name={score.homeName}
                    src={score.homeCrestSrc}
                    color={score.homeColor}
                    size="md"
                    fit="contain"
                    className="!h-[78%] !w-[78%]"
                  />
                </div>
              </div>
              <p className="font-display text-sm font-bold uppercase tracking-[-0.02em] text-white sm:text-lg">
                {score.homeName}
              </p>
            </div>
            <div className="relative min-w-[110px] text-center">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(245,200,66,0.22),transparent_70%)]"
                aria-hidden
              />
              <p className="loslunes-gold-score relative font-live-serif text-[clamp(40px,9vw,72px)] font-black leading-none tracking-tight tabular-nums">
                {score.homeScore}
                <span className="mx-[0.12em]">-</span>
                {score.awayScore}
              </p>
            </div>
            <div className="flex min-w-0 flex-col items-center text-center">
              <div className="mb-2 rounded-full bg-gradient-to-br from-[#fff1b0] via-[#d4af37] to-[#8a6414] p-[2px] shadow-[0_0_18px_rgba(212,175,55,0.35)]">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#141010] sm:h-16 sm:w-16">
                  <TeamCrest
                    name={score.awayName}
                    src={score.awayCrestSrc}
                    color={score.awayColor}
                    size="md"
                    fit="contain"
                    className="!h-[78%] !w-[78%]"
                  />
                </div>
              </div>
              <p className="font-display text-sm font-bold uppercase tracking-[-0.02em] text-white sm:text-lg">
                {score.awayName}
              </p>
            </div>
          </div>
        ) : null}
        <div className="mt-4">
          <LosLunesGoldDivider text="Fútbol — Disciplina — Amigos" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 mb-6 px-1">
      <h2 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white sm:text-2xl">
        Cronología
      </h2>
    </div>
  )
}

function TimelineFooterLosLunes() {
  return (
    <div className="relative z-10 mt-8 flex items-end justify-between gap-4 border-t border-amber-400/15 px-1 pt-5">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/40 sm:text-xs">
        Más que un partido
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOSLUNES_LOGO_PATH} alt="" className="h-8 w-8 object-contain opacity-90 sm:h-9 sm:w-9" />
    </div>
  )
}
