'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

type Option = { id: string; name: string }

type Props = {
  seasons: Option[]
  teams: Option[]
  referees: Array<{ id: string; name: string }>
}

export function MatchForm({ seasons, teams, referees }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const date = form.get('date') as string
    const time = form.get('time') as string
    const result = await submitJson('/api/matches', 'POST', {
      matchType: 'LEAGUE',
      seasonId: form.get('seasonId'),
      homeTeamId: form.get('homeTeamId'),
      awayTeamId: form.get('awayTeamId'),
      refereeId: form.get('refereeId') || undefined,
      venue: form.get('venue') || undefined,
      scheduledAt: new Date(`${date}T${time}`).toISOString(),
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3">
      <select name="seasonId" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Temporada</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select name="homeTeamId" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Local</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select name="awayTeamId" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Visitante</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select name="refereeId" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Ãrbitro</option>
        {referees.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <input name="date" type="date" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="time" type="time" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="venue" placeholder="Cancha" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2" />
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50">
        {loading ? 'Creandoâ€¦' : 'Crear partido'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-3">{error}</p>}
    </form>
  )
}
