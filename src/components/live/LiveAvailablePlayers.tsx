'use client'

import {
  LosLunesFlankedTitle,
  LosLunesPhotoRing,
} from '@/components/live/loslunes-live-ui'
import { personInitials } from '@/lib/player-name'
import type { LiveRosterPlayer } from '@/lib/live-match-snapshot'

type Props = {
  players: LiveRosterPlayer[]
  paidByPlayerId: Record<string, boolean>
  premium?: boolean
  galletaPlayerIds?: string[]
  title?: string
}

function PaymentBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-md px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] ${
        paid
          ? 'bg-emerald-500 text-emerald-950 shadow-[0_0_0_1px_rgba(16,185,129,0.55)]'
          : 'bg-red-600 text-white shadow-[0_0_0_1px_rgba(220,38,38,0.65)]'
      }`}
    >
      {paid ? 'Pagó' : 'No pagó'}
    </span>
  )
}

function PlayerPhoto({
  name,
  photoUrl,
  paid,
  premium,
  isGalleta,
}: {
  name: string
  photoUrl: string | null
  paid: boolean
  premium: boolean
  isGalleta: boolean
}) {
  const ring = paid ? 'ring-2 ring-emerald-400' : 'ring-2 ring-red-500'

  if (premium) {
    return (
      <div className={`relative rounded-full ${ring}`}>
        <LosLunesPhotoRing name={name} photoUrl={photoUrl} size="md" />
        {isGalleta ? (
          <span className="absolute -bottom-0.5 -right-0.5 text-xs leading-none">🍪</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative shrink-0">
      <div
        className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 bg-[#121A18] text-xs font-bold text-[#E8E4D8] ${
          paid ? 'border-emerald-400' : 'border-red-500'
        }`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{personInitials(name)}</span>
        )}
      </div>
      {isGalleta ? (
        <span className="absolute -bottom-0.5 -right-0.5 text-sm leading-none">🍪</span>
      ) : null}
    </div>
  )
}

export function LiveAvailablePlayers({
  players,
  paidByPlayerId,
  premium = false,
  galletaPlayerIds,
  title = 'Jugadores del partido',
}: Props) {
  if (players.length === 0) return null

  const unpaidCount = players.filter((p) => !paidByPlayerId[p.playerId]).length
  const paidCount = players.length - unpaidCount
  const sorted = [...players].sort((a, b) => {
    const aPaid = Boolean(paidByPlayerId[a.playerId])
    const bPaid = Boolean(paidByPlayerId[b.playerId])
    if (aPaid !== bPaid) return aPaid ? 1 : -1
    return a.playerName.localeCompare(b.playerName, 'es')
  })

  return (
    <div>
      {premium ? (
        <div className="mb-4">
          <LosLunesFlankedTitle>{title}</LosLunesFlankedTitle>
        </div>
      ) : (
        <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-[0.25em] text-amber-200/75">
          {title}
        </h2>
      )}

      <div
        className={`mb-4 flex flex-wrap items-center justify-center gap-2 ${
          premium ? 'text-[10px]' : 'text-xs'
        }`}
      >
        <span
          className={`rounded-md px-2.5 py-1 font-black uppercase tracking-wide ${
            unpaidCount > 0
              ? 'bg-red-600/90 text-white'
              : 'bg-white/10 text-white/50'
          }`}
        >
          {unpaidCount} sin pagar
        </span>
        <span className="rounded-md bg-emerald-500/90 px-2.5 py-1 font-black uppercase tracking-wide text-emerald-950">
          {paidCount} pagaron
        </span>
      </div>

      <ul className="space-y-2">
        {sorted.map((player) => {
          const paid = Boolean(paidByPlayerId[player.playerId])
          return (
            <li
              key={player.playerId}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                paid
                  ? 'bg-emerald-500/10 ring-1 ring-emerald-400/40'
                  : 'bg-red-600/15 ring-1 ring-red-500/50'
              }`}
            >
              <PlayerPhoto
                name={player.playerName}
                photoUrl={player.photoUrl}
                paid={paid}
                premium={premium}
                isGalleta={Boolean(galletaPlayerIds?.includes(player.playerId))}
              />
              <p
                className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                  premium ? 'text-white' : 'text-[#E8E4D8]'
                }`}
              >
                {player.playerName}
              </p>
              <PaymentBadge paid={paid} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
