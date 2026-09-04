export type EmojiPickerGroup = {
  label: string
  emojis: string[]
}

/** Emojis curados para premios de liga (≤8 chars cada uno, sin dependencias externas). */
export const AWARD_EMOJI_GROUPS: EmojiPickerGroup[] = [
  {
    label: 'Deporte',
    emojis: ['⚽', '🥅', '🧤', '🦵', '🏃', '💪', '🫁', '🎯'],
  },
  {
    label: 'Trofeos',
    emojis: ['🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑', '⭐'],
  },
  {
    label: 'Reconocimiento',
    emojis: ['🌟', '✨', '🔥', '💯', '👏', '🎉', '🤝', '❤️'],
  },
  {
    label: 'Espíritu',
    emojis: ['🦁', '🐐', '🦅', '🧠', '🛡️', '⚡', '🎭', '🤩'],
  },
]

export const AWARD_EMOJI_OPTIONS = AWARD_EMOJI_GROUPS.flatMap((group) => group.emojis)

export function isAllowedAwardEmoji(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 8 && AWARD_EMOJI_OPTIONS.includes(trimmed)
}
