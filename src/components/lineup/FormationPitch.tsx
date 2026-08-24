'use client'

import { useCallback, useRef, useState } from 'react'
import { TeamCrest } from '@/components/TeamCrest'
import { LiveTeamStaff } from '@/components/live/LiveTeamStaff'
import { personInitials } from '@/lib/player-name'
import type { LineupView } from '@/lib/match-lineup'

type Props = {
  lineup: LineupView
  /** If provided, empty slots become selectable */
  onSelectSlot?: (slotKey: string) => void
  selectedSlotKey?: string | null
  className?: string
  variant?: 'editor' | 'live'
  teamName?: string
  crestSrc?: string | null
  color?: string | null
  coachLabel?: string | null
  mvpPlayerIds?: string[]
  captainPlayerIds?: string[]
  paidByPlayerId?: Record<string, boolean>
  galletaPlayerIds?: string[]
  layoutMode?: boolean
  onSlotLayoutChange?: (slotKey: string, pos: { topPct: number; leftPct: number }) => void
  readOnlyLayout?: boolean
}

const DRAG_THRESHOLD_PX = 5
const MIN_PCT = 5
const MAX_PCT = 95

function clampPct(value: number): number {
  return Math.min(MAX_PCT, Math.max(MIN_PCT, value))
}

function PitchSurface() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl">
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            180deg,
            #1a6b40 0px,
            #1a6b40 24px,
            #207648 24px,
            #207648 48px
          )`,
        }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-white/25"
        viewBox="0 0 100 150"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect x="4" y="4" width="92" height="142" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <line x1="4" y1="75" x2="96" y2="75" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="75" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <rect x="22" y="4" width="56" height="22" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <rect x="34" y="4" width="32" height="8" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <rect x="22" y="124" width="56" height="22" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <rect x="34" y="138" width="32" height="8" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <circle cx="50" cy="16" r="0.8" fill="currentColor" />
        <circle cx="50" cy="134" r="0.8" fill="currentColor" />
      </svg>
    </div>
  )
}

function playerPhotoBorderClass(
  filled: boolean,
  size: 'live' | 'editor',
  playerId: string | null,
  paidByPlayerId?: Record<string, boolean>
): string {
  if (!filled) return 'border-dashed border-white/50'
  if (size === 'live' && playerId && paidByPlayerId && playerId in paidByPlayerId) {
    return paidByPlayerId[playerId] ? 'border-emerald-400' : 'border-red-500'
  }
  return 'border-white/90'
}

function PlayerCircle({
  label,
  playerName,
  photoUrl,
  filled,
  size,
  playerId,
  isMvp,
  isCaptain,
  isGalleta,
  paidByPlayerId,
}: {
  label: string
  playerName: string | null
  photoUrl: string | null
  filled: boolean
  size: 'live' | 'editor'
  playerId?: string | null
  isMvp?: boolean
  isCaptain?: boolean
  isGalleta?: boolean
  paidByPlayerId?: Record<string, boolean>
}) {
  const dim = size === 'live' ? 'h-10 w-10' : 'h-12 w-12'
  const textSize = size === 'live' ? 'text-[11px]' : 'text-[10px]'
  const mvpRing = isMvp ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-emerald-800' : ''
  const captainRing = isCaptain && !isMvp ? 'ring-2 ring-sky-300 ring-offset-1 ring-offset-emerald-800' : ''
  const borderClass = playerPhotoBorderClass(filled, size, playerId ?? null, paidByPlayerId)

  return (
    <div className={`relative shrink-0 ${isMvp || isCaptain || isGalleta ? 'z-20' : ''}`}>
      <div
        className={`flex ${dim} items-center justify-center overflow-hidden rounded-full border-2 ${textSize} font-bold shadow-lg ${mvpRing} ${captainRing} ${borderClass} ${
          filled ? 'bg-kelme-surface text-emerald-900' : 'bg-black/25 text-white/60'
        }`}
      >
        {filled && photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={playerName ?? label} className="h-full w-full object-cover" />
        ) : (
          <span>{filled ? personInitials(playerName!) : label}</span>
        )}
      </div>
      {isMvp && (
        <span
          className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-[10px] font-bold leading-none text-emerald-950 shadow-md"
          title="MVP"
        >
          ★
        </span>
      )}
      {isGalleta && (
        <span
          className="absolute -right-1.5 -bottom-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-50 text-[11px] leading-none shadow-md"
          title="Galleta"
        >
          🍪
        </span>
      )}
      {isCaptain && (
        <span
          className="absolute -bottom-1.5 -left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-[9px] font-bold leading-none text-white shadow-md"
          title="Capitán"
        >
          C
        </span>
      )}
    </div>
  )
}

function LivePlayerMarker({
  slot,
  top,
  left,
  mvpPlayerIds,
  captainPlayerIds,
  paidByPlayerId,
  galletaPlayerIds,
}: {
  slot: LineupView['pitch'][number]
  top: string
  left: string
  mvpPlayerIds?: string[]
  captainPlayerIds?: string[]
  paidByPlayerId?: Record<string, boolean>
  galletaPlayerIds?: string[]
}) {
  const filled = Boolean(slot.playerName)
  const isMvp = Boolean(slot.playerId && mvpPlayerIds?.includes(slot.playerId))
  const isCaptain = Boolean(slot.playerId && captainPlayerIds?.includes(slot.playerId))
  const isGalleta = Boolean(slot.playerId && galletaPlayerIds?.includes(slot.playerId))

  return (
    <div
      className="absolute z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center overflow-visible"
      style={{ top, left }}
    >
      <PlayerCircle
        label={slot.label}
        playerName={slot.playerName}
        photoUrl={slot.playerPhotoUrl}
        filled={filled}
        size="live"
        playerId={slot.playerId}
        isMvp={isMvp}
        isCaptain={isCaptain}
        isGalleta={isGalleta}
        paidByPlayerId={paidByPlayerId}
      />
      {filled && (
        <span className="mt-1 max-w-[4.75rem] truncate text-center text-[9px] font-medium leading-tight text-white drop-shadow-none">
          {slot.playerName}
        </span>
      )}
    </div>
  )
}

type DragState = {
  slotKey: string
  startX: number
  startY: number
  startTopPct: number
  startLeftPct: number
  currentTopPct: number
  currentLeftPct: number
  dragging: boolean
}

export function FormationPitch({
  lineup,
  onSelectSlot,
  selectedSlotKey,
  className = '',
  variant = 'editor',
  teamName,
  crestSrc,
  color,
  coachLabel,
  mvpPlayerIds,
  captainPlayerIds,
  paidByPlayerId,
  galletaPlayerIds,
  layoutMode = false,
  onSlotLayoutChange,
  readOnlyLayout = false,
}: Props) {
  const pitchRef = useRef<HTMLDivElement>(null)
  const skipNextClickRef = useRef(false)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const isLive = variant === 'live'
  const canDragLayout = layoutMode && !readOnlyLayout && !isLive && Boolean(onSlotLayoutChange)

  const clientToPct = useCallback((clientX: number, clientY: number) => {
    const rect = pitchRef.current?.getBoundingClientRect()
    if (!rect) return null
    const topPct = clampPct(((clientY - rect.top) / rect.height) * 100)
    const leftPct = clampPct(((clientX - rect.left) / rect.width) * 100)
    return { topPct, leftPct }
  }, [])

  function handlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    slot: LineupView['pitch'][number]
  ) {
    if (!canDragLayout || slot.slotKey === 'GK') return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragState({
      slotKey: slot.slotKey,
      startX: e.clientX,
      startY: e.clientY,
      startTopPct: slot.topPct,
      startLeftPct: slot.leftPct,
      currentTopPct: slot.topPct,
      currentLeftPct: slot.leftPct,
      dragging: false,
    })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState) return
    const dx = e.clientX - dragState.startX
    const dy = e.clientY - dragState.startY
    const dist = Math.hypot(dx, dy)
    const pct = clientToPct(e.clientX, e.clientY)
    if (!pct) return

    if (!dragState.dragging && dist >= DRAG_THRESHOLD_PX) {
      setDragState((prev) =>
        prev ? { ...prev, dragging: true, currentTopPct: pct.topPct, currentLeftPct: pct.leftPct } : null
      )
      return
    }

    if (dragState.dragging) {
      setDragState((prev) =>
        prev ? { ...prev, currentTopPct: pct.topPct, currentLeftPct: pct.leftPct } : null
      )
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    const dx = e.clientX - dragState.startX
    const dy = e.clientY - dragState.startY
    const dist = Math.hypot(dx, dy)

    if (dragState.dragging || dist >= DRAG_THRESHOLD_PX) {
      skipNextClickRef.current = true
      onSlotLayoutChange?.(dragState.slotKey, {
        topPct: dragState.currentTopPct,
        leftPct: dragState.currentLeftPct,
      })
    }

    setDragState(null)
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragState(null)
  }

  function handleClick(slotKey: string) {
    if (layoutMode || skipNextClickRef.current) {
      skipNextClickRef.current = false
      return
    }
    onSelectSlot?.(slotKey)
  }

  const pitch = (
    <div
      ref={pitchRef}
      className={`relative aspect-[2/3] w-full overflow-visible rounded-xl border border-emerald-900/80 ${
        isLive ? 'shadow-inner' : 'border-emerald-800 bg-gradient-to-b from-emerald-700 to-emerald-900'
      }`}
    >
      {isLive ? <PitchSurface /> : null}

      <p
        className={`absolute left-2 top-2 z-20 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          isLive ? 'bg-black/50 text-amber-200/90' : 'bg-black/40 text-white'
        }`}
      >
        {lineup.scheme}
      </p>

      {lineup.pitch.map((slot) => {
        const isDragging = dragState?.slotKey === slot.slotKey
        const top = isDragging ? `${dragState.currentTopPct}%` : `${slot.topPct}%`
        const left = isDragging ? `${dragState.currentLeftPct}%` : `${slot.leftPct}%`
        const filled = Boolean(slot.playerName)
        const isMvp = Boolean(slot.playerId && mvpPlayerIds?.includes(slot.playerId))
        const isCaptain = Boolean(slot.playerId && captainPlayerIds?.includes(slot.playerId))
        const draggable = canDragLayout && slot.slotKey !== 'GK'

        if (isLive) {
          return (
            <LivePlayerMarker
              key={slot.slotKey}
              slot={slot}
              top={top}
              left={left}
              mvpPlayerIds={mvpPlayerIds}
              captainPlayerIds={captainPlayerIds}
              paidByPlayerId={paidByPlayerId}
              galletaPlayerIds={galletaPlayerIds}
            />
          )
        }

        return (
          <button
            key={slot.slotKey}
            type="button"
            disabled={!onSelectSlot && !draggable}
            onClick={() => handleClick(slot.slotKey)}
            onPointerDown={draggable ? (e) => handlePointerDown(e, slot) : undefined}
            onPointerMove={draggable ? handlePointerMove : undefined}
            onPointerUp={draggable ? handlePointerUp : undefined}
            onPointerCancel={draggable ? handlePointerCancel : undefined}
            style={{
              top,
              left,
              transform: 'translate(-50%, -50%)',
              touchAction: draggable ? 'none' : undefined,
            }}
            className={`absolute z-10 flex flex-col items-center justify-center text-center leading-tight ${
              selectedSlotKey === slot.slotKey && !layoutMode ? 'scale-105' : ''
            } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${
              isDragging && dragState.dragging ? 'z-30' : ''
            }`}
          >
            <PlayerCircle
              label={slot.label}
              playerName={slot.playerName}
              photoUrl={slot.playerPhotoUrl}
              filled={filled}
              size="editor"
              playerId={slot.playerId}
              isMvp={isMvp}
              isCaptain={isCaptain}
            />
            <span className="mt-1 line-clamp-2 max-w-[4rem] px-0.5 text-[10px] text-white">
              {filled ? slot.playerName : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )

  if (!isLive) {
    return <div className={className}>{pitch}</div>
  }

  return (
    <div className={className}>
      {teamName && (
        <div className="mb-3 space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <TeamCrest name={teamName} src={crestSrc} color={color} size="sm" />
            <p className="font-ui text-xs font-semibold uppercase tracking-widest text-white/85">
              {teamName}
            </p>
          </div>
          {coachLabel && <LiveTeamStaff coachLabel={coachLabel} compact />}
        </div>
      )}
      {pitch}
    </div>
  )
}
