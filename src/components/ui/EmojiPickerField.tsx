'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AWARD_EMOJI_GROUPS } from '@/lib/award-emoji-options'

type Props = {
  value: string
  onChange: (emoji: string) => void
  name?: string
  required?: boolean
  inputClassName?: string
  compact?: boolean
}

export function EmojiPickerField({
  value,
  onChange,
  name,
  required,
  inputClassName = 'input-kelme rounded-lg px-3 py-2',
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          className={
            compact
              ? 'grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-kelme-border bg-kelme-gray-100 text-lg hover:border-kelme-red'
              : 'grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-kelme-border bg-kelme-surface text-xl hover:border-kelme-red'
          }
          title="Elegir emoji"
        >
          {value || '😀'}
        </button>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={8}
          required={required && !name}
          placeholder="Emoji"
          className={`min-w-0 flex-1 ${inputClassName}`}
          aria-label="Emoji del premio"
        />
      </div>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Emojis sugeridos"
          className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-kelme-border bg-kelme-surface p-3 shadow-lg"
        >
          <div className="max-h-56 space-y-3 overflow-y-auto">
            {AWARD_EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-kelme-gray-400">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      role="option"
                      aria-selected={value === emoji}
                      onClick={() => {
                        onChange(emoji)
                        setOpen(false)
                      }}
                      className={`grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-kelme-gray-100 ${
                        value === emoji ? 'bg-kelme-red/15 ring-1 ring-kelme-red' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
