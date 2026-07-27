/** Vertical positions aligned with FormationPitch SVG (viewBox height 150). */

/** Bottom goal area center — GK defends this end (live and editor). */
export const GK_BOTTOM_PERCENT = (139 / 150) * 100

/** @deprecated Use GK_BOTTOM_PERCENT — live now matches editor orientation. */
export const GK_EDITOR_BOTTOM_PERCENT = GK_BOTTOM_PERCENT

export function slotTopPercent(
  row: number,
  maxRow: number,
  _variant: 'editor' | 'live',
  compact: boolean
): number {
  if (maxRow <= 0) return 50

  if (row === 0) {
    return GK_BOTTOM_PERCENT
  }

  const attackLine = compact ? 72 : 68
  const defendLine = compact ? 22 : 18
  const t = (row - 1) / Math.max(maxRow - 1, 1)

  const bottomLine = 100 - defendLine
  const topLine = 100 - attackLine
  return topLine + (1 - t) * (bottomLine - topLine)
}
