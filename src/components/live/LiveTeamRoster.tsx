import { TeamCrest } from '@/components/TeamCrest'
import { LiveTeamStaff } from '@/components/live/LiveTeamStaff'
import {
  LosLunesFlankedTitle,
  LosLunesPhotoRing,
} from '@/components/live/loslunes-live-ui'
import { personInitials } from '@/lib/player-name'
import type { LiveRosterSide } from '@/lib/live-match-snapshot'

type Props = {
  rosters: LiveRosterSide[]
  premium?: boolean
  footballFormatLabel?: string
  paidByPlayerId?: Record<string, boolean>
  galletaPlayerIds?: string[]
  captainPlayerIds?: string[]
  mvpPlayerIds?: string[]
}

function paymentBorderClass(
  playerId: string,
  paidByPlayerId?: Record<string, boolean>,
): string {
  if (!paidByPlayerId || !(playerId in paidByPlayerId)) return 'border-white/20'
  return paidByPlayerId[playerId] ? 'border-emerald-400' : 'border-red-500'
}

function RosterPlayerAvatar({
  playerId,
  name,
  photoUrl,
  premium,
  paidByPlayerId,
  isCaptain,
  isGalleta,
  isMvp,
}: {
  playerId: string
  name: string
  photoUrl: string | null
  premium: boolean
  paidByPlayerId?: Record<string, boolean>
  isCaptain: boolean
  isGalleta: boolean
  isMvp: boolean
}) {
  if (premium) {
    return (
      <div className="relative">
        <div
          className={`rounded-full p-0.5 ${
            paidByPlayerId && playerId in paidByPlayerId
              ? paymentBorderClass(playerId, paidByPlayerId)
              : 'border border-[#d4af37]/30'
          }`}
        >
          <LosLunesPhotoRing name={name} photoUrl={photoUrl} size="md" />
        </div>
        {isMvp ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-emerald-950">
            ★
          </span>
        ) : null}
        {isGalleta ? (
          <span className="absolute -bottom-0.5 -right-0.5 text-xs leading-none">🍪</span>
        ) : null}
        {isCaptain ? (
          <span className="absolute -bottom-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[8px] font-bold text-white">
            C
          </span>
        ) : null}
      </div>
    )
  }

  const borderClass = paymentBorderClass(playerId, paidByPlayerId)

  return (
    <div className="relative shrink-0">
      <div
        className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 bg-[#121A18] text-xs font-bold text-[#E8E4D8] shadow-md ${borderClass} ${
          isMvp ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#0B1210]' : ''
        } ${isCaptain && !isMvp ? 'ring-2 ring-sky-300 ring-offset-1 ring-offset-[#0B1210]' : ''}`}
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
      {isCaptain ? (
        <span className="absolute -bottom-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-sky-500 text-[8px] font-bold text-white">
          C
        </span>
      ) : null}
      {isMvp ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-emerald-950">
          ★
        </span>
      ) : null}
    </div>
  )
}

function RosterSideColumn({
  side,
  premium,
  paidByPlayerId,
  galletaPlayerIds,
  captainPlayerIds,
  mvpPlayerIds,
}: {
  side: LiveRosterSide
  premium: boolean
  paidByPlayerId?: Record<string, boolean>
  galletaPlayerIds?: string[]
  captainPlayerIds?: string[]
  mvpPlayerIds?: string[]
}) {
  return (
    <div>
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <TeamCrest name={side.label} src={side.crestSrc} color={side.color} size="md" />
        <p
          className={`font-display text-sm font-bold uppercase tracking-wide ${
            premium ? 'text-white' : 'text-[#E8E4D8]'
          }`}
        >
          {side.label}
        </p>
        <LiveTeamStaff captainLabel={null} coachLabel={side.coachLabel} />
      </div>

      {side.players.length === 0 ? (
        <p className={`text-center text-sm ${premium ? 'text-white/40' : 'text-[#8A938C]'}`}>
          Sin jugadores convocados.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {side.players.map((player) => (
            <li key={player.playerId} className="flex flex-col items-center gap-1.5 text-center">
              <RosterPlayerAvatar
                playerId={player.playerId}
                name={player.playerName}
                photoUrl={player.photoUrl}
                premium={premium}
                paidByPlayerId={paidByPlayerId}
                isCaptain={Boolean(captainPlayerIds?.includes(player.playerId))}
                isGalleta={Boolean(galletaPlayerIds?.includes(player.playerId))}
                isMvp={Boolean(mvpPlayerIds?.includes(player.playerId))}
              />
              <p
                className={`line-clamp-2 w-full text-[11px] font-medium leading-tight ${
                  premium ? 'text-white/85' : 'text-[#E8E4D8]/90'
                }`}
              >
                {player.playerName}
              </p>
              {paidByPlayerId && player.playerId in paidByPlayerId ? (
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                    paidByPlayerId[player.playerId]
                      ? 'bg-emerald-500 text-emerald-950'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {paidByPlayerId[player.playerId] ? 'Pagó' : 'No pagó'}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function LiveTeamRoster({
  rosters,
  premium = false,
  footballFormatLabel: formatLabel,
  paidByPlayerId,
  galletaPlayerIds,
  captainPlayerIds,
  mvpPlayerIds,
}: Props) {
  const showPaymentLegend = Boolean(paidByPlayerId)
  const showGalletaLegend = Boolean(galletaPlayerIds && galletaPlayerIds.length > 0)

  return (
    <>
      {premium ? (
        <div className="mb-4">
          <LosLunesFlankedTitle>Plantel</LosLunesFlankedTitle>
        </div>
      ) : (
        <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-[0.25em] text-amber-200/75">
          Plantel
        </h2>
      )}
      <p
        className={`text-center font-ui uppercase tracking-[0.2em] ${
          premium ? 'mb-4 text-[10px] text-white/40' : 'mb-4 text-xs text-white/40'
        }`}
      >
        {formatLabel ? `${formatLabel} · ` : ''}
        Formaciones en preparación
        {showPaymentLegend ? ' · Badge verde: pagó · Badge rojo: no pagó' : ''}
        {showGalletaLegend ? ' · 🍪 Galleta' : ''}
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {rosters.map((side) => (
          <RosterSideColumn
            key={side.label}
            side={side}
            premium={premium}
            paidByPlayerId={paidByPlayerId}
            galletaPlayerIds={galletaPlayerIds}
            captainPlayerIds={captainPlayerIds}
            mvpPlayerIds={mvpPlayerIds}
          />
        ))}
      </div>
    </>
  )
}
