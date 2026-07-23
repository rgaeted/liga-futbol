/** Vertical positions aligned with FormationPitch SVG (viewBox height 150). */

/** Top goal area center — live GK defends this end. */
export const GK_LIVE_TOP_PERCENT = (11 / 150) * 100

/** Bottom goal area center — editor GK defends this end. */
export const GK_EDITOR_BOTTOM_PERCENT = (139 / 150) * 100

export function slotTopPercent(
  row: number,
  maxRow: number,
  variant: 'editor' | 'live',
  compact: boolean
): number {
  if (maxRow <= 0) return 50

  if (row === 0) {
    return variant === 'live' ? GK_LIVE_TOP_PERCENT : GK_EDITOR_BOTTOM_PERCENT
  }

  const attackLine = compact ? 72 : 68
  const defendLine = compact ? 22 : 18
  const t = (row - 1) / Math.max(maxRow - 1, 1)

  if (variant === 'live') {
    return defendLine + t * (attackLine - defendLine)
  }

  const bottomLine = 100 - defendLine
  const topLine = 100 - attackLine
  return topLine + (1 - t) * (bottomLine - topLine)
}
