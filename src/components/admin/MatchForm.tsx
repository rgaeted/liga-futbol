'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Option = { id: string; name: string }

type Props = {
  seasons: Option[]
  teams: Option[]
  referees: Array<{ id: string; name: string }>
}

export function MatchForm({ seasons, teams, referees }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const date = form.get('date') as string
    const time = form.get('time') as string
    await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: form.get('seasonId'),
        homeTeamId: form.get('homeTeamId'),
        awayTeamId: form.get('awayTeamId'),
        refereeId: form.get('refereeId') || undefined,
        venue: form.get('venue') || undefined,
        scheduledAt: new Date(`${date}T${time}`).toISOString(),
      }),
    })
    setLoading(false)
    e.currentTarget.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-3">
      <select name="seasonId" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
        <option value="">Temporada</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select name="homeTeamId" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
        <option value="">Local</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select name="awayTeamId" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
        <option value="">Visitante</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select name="refereeId" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
        <option value="">Árbitro</option>
        {referees.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <input name="date" type="date" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <input name="time" type="time" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <input name="venue" placeholder="Cancha" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 md:col-span-2" />
      <button type="submit" disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50">
        Crear partido
      </button>
    </form>
  )
}
