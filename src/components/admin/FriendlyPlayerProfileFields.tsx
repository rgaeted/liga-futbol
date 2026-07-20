'use client'

import {
  DOMINANT_FOOT_LABELS,
  DOMINANT_FOOT_VALUES,
  FRIENDLY_PLAYER_POSITIONS,
  type DominantFootValue,
  type FriendlyPlayerPosition,
} from '@/lib/friendly-player-options'

const selectClass =
  'rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2'

type Props = {
  dominantFoot?: string
  primaryPosition?: string
  secondaryPosition?: string
  onDominantFootChange?: (value: string) => void
  onPrimaryPositionChange?: (value: string) => void
  onSecondaryPositionChange?: (value: string) => void
  compact?: boolean
}

export function FriendlyPlayerProfileFields({
  dominantFoot = '',
  primaryPosition = '',
  secondaryPosition = '',
  onDominantFootChange,
  onPrimaryPositionChange,
  onSecondaryPositionChange,
  compact = false,
}: Props) {
  const controlled = Boolean(onDominantFootChange)

  return (
    <>
      <select
        name={controlled ? undefined : 'dominantFoot'}
        value={controlled ? dominantFoot : undefined}
        defaultValue={controlled ? undefined : dominantFoot}
        onChange={onDominantFootChange ? (e) => onDominantFootChange(e.target.value) : undefined}
        className={compact ? `${selectClass} px-2 py-1 text-sm` : selectClass}
        aria-label="Pie dominante"
      >
        <option value="">Pie dominante (opcional)</option>
        {DOMINANT_FOOT_VALUES.map((value) => (
          <option key={value} value={value}>
            {DOMINANT_FOOT_LABELS[value as DominantFootValue]}
          </option>
        ))}
      </select>
      <select
        name={controlled ? undefined : 'primaryPosition'}
        value={controlled ? primaryPosition : undefined}
        defaultValue={controlled ? undefined : primaryPosition}
        onChange={
          onPrimaryPositionChange ? (e) => onPrimaryPositionChange(e.target.value) : undefined
        }
        className={compact ? `${selectClass} px-2 py-1 text-sm` : selectClass}
        aria-label="Posición regular"
      >
        <option value="">Posición regular (opcional)</option>
        {FRIENDLY_PLAYER_POSITIONS.map((position) => (
          <option key={position} value={position}>
            {position}
          </option>
        ))}
      </select>
      <select
        name={controlled ? undefined : 'secondaryPosition'}
        value={controlled ? secondaryPosition : undefined}
        defaultValue={controlled ? undefined : secondaryPosition}
        onChange={
          onSecondaryPositionChange ? (e) => onSecondaryPositionChange(e.target.value) : undefined
        }
        className={compact ? `${selectClass} px-2 py-1 text-sm` : selectClass}
        aria-label="Segunda posición"
      >
        <option value="">Segunda posición (opcional)</option>
        {FRIENDLY_PLAYER_POSITIONS.map((position) => (
          <option key={position} value={position}>
            {position}
          </option>
        ))}
      </select>
    </>
  )
}

export function readFriendlyPlayerProfileFromForm(form: FormData) {
  const dominantFoot = String(form.get('dominantFoot') ?? '').trim()
  const primaryPosition = String(form.get('primaryPosition') ?? '').trim()
  const secondaryPosition = String(form.get('secondaryPosition') ?? '').trim()

  return {
    ...(dominantFoot ? { dominantFoot: dominantFoot as DominantFootValue } : {}),
    ...(primaryPosition
      ? { primaryPosition: primaryPosition as FriendlyPlayerPosition }
      : {}),
    ...(secondaryPosition
      ? { secondaryPosition: secondaryPosition as FriendlyPlayerPosition }
      : {}),
  }
}

export function friendlyPlayerProfilePayload(
  dominantFoot: string,
  primaryPosition: string,
  secondaryPosition: string
) {
  return {
    dominantFoot: dominantFoot ? (dominantFoot as DominantFootValue) : null,
    primaryPosition: primaryPosition ? (primaryPosition as FriendlyPlayerPosition) : null,
    secondaryPosition: secondaryPosition
      ? (secondaryPosition as FriendlyPlayerPosition)
      : null,
  }
}
