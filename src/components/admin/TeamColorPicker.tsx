'use client'

import { TeamCrest } from '@/components/TeamCrest'
import { TEAM_COLOR_PALETTE, resolveTeamColor } from '@/lib/team-color'

type Props = {
  name: string
  value: string | null
  onChange: (color: string) => void
  hasCrest?: boolean
  crestSrc?: string | null
}

export function TeamColorPicker({ name, value, onChange, hasCrest, crestSrc }: Props) {
  const resolved = resolveTeamColor(value, name)

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-kelme-gray-600">Color del equipo</p>
      <div className="flex items-center gap-3">
        <TeamCrest
          name={name}
          color={resolved}
          src={hasCrest ? crestSrc : null}
          size="sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {TEAM_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => onChange(color)}
              className={`h-6 w-6 rounded-full border border-black/10 ring-2 transition-transform hover:scale-110 ${
                resolved === color ? 'ring-kelme-red' : 'ring-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
