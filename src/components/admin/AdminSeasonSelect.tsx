'use client'

import { useRouter } from 'next/navigation'

export function AdminSeasonSelect({
  seasons,
  value,
}: {
  seasons: Array<{ id: string; name: string }>
  value: string | null
}) {
  const router = useRouter()

  if (seasons.length === 0) return null

  return (
    <select
      value={value ?? seasons[0]?.id ?? ''}
      onChange={(e) => {
        const next = e.target.value
        router.push(next ? `/admin?season=${encodeURIComponent(next)}` : '/admin')
      }}
      className="h-[42px] rounded-[10px] border border-zinc-200 bg-white px-3 font-ui text-sm font-semibold text-zinc-900"
    >
      {seasons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}
