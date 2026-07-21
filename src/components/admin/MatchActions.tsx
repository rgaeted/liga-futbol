'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FootballFormat, MatchType } from '@prisma/client'
import { FOOTBALL_FORMATS, footballFormatLabel } from '@/lib/football-format'
import { matchSideCrestUrl } from '@/lib/match-side-crest'
import { scheduleInputToIso } from '@/lib/schedule-datetime'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'
import { CrestUploadField } from './CrestUploadField'

export type MatchRow = {
  id: string
  label: string // "Local vs Visitante"
  matchType: MatchType
  sideAName: string | null
  sideBName: string | null
  hasCrestA: boolean
  hasCrestB: boolean
  refereeId: string | null
  venue: string | null
  status: string
  footballFormat: FootballFormat
  date: string // yyyy-mm-dd
  time: string // HH:mm
}

type RefereeOption = { id: string; name: string }

const STATUSES = ['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED'] as const

export function MatchActions({ match, referees }: { match: MatchRow; referees: RefereeOption[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [refereeId, setRefereeId] = useState(match.refereeId ?? '')
  const [venue, setVenue] = useState(match.venue ?? '')
  const [status, setStatus] = useState(match.status)
  const [footballFormat, setFootballFormat] = useState(match.footballFormat)
  const [date, setDate] = useState(match.date)
  const [time, setTime] = useState(match.time)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/matches/${match.id}`, 'PUT', {
      refereeId: refereeId || null,
      venue: venue || null,
      status,
      footballFormat,
      scheduledAt: scheduleInputToIso(date, time),
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
        >
          Editar
        </button>
        <DeleteButton
          url={`/api/matches/${match.id}`}
          confirmMessage={`¿Eliminar el partido ${match.label}? Se borran sus eventos y citaciones.`}
        />
      </span>
    )
  }

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-kelme-border bg-kelme-gray-100 p-3 md:grid-cols-3">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        value={footballFormat}
        onChange={(e) => setFootballFormat(e.target.value as FootballFormat)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      >
        {FOOTBALL_FORMATS.map((format) => (
          <option key={format} value={format}>
            {footballFormatLabel(format)}
          </option>
        ))}
      </select>
      <select
        value={refereeId}
        onChange={(e) => setRefereeId(e.target.value)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      >
        <option value="">Sin árbitro</option>
        {referees.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <input
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        placeholder="Cancha"
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      />
      {match.matchType === 'FRIENDLY' && (
        <>
          <CrestUploadField
            label={`Escudo lado A (${match.sideAName ?? 'A'})`}
            name={match.sideAName ?? 'Lado A'}
            uploadUrl={`/api/matches/${match.id}/crest/A`}
            previewUrl={matchSideCrestUrl(match.id, 'A')}
            hasCrest={match.hasCrestA}
            onUpdated={() => router.refresh()}
          />
          <CrestUploadField
            label={`Escudo lado B (${match.sideBName ?? 'B'})`}
            name={match.sideBName ?? 'Lado B'}
            uploadUrl={`/api/matches/${match.id}/crest/B`}
            previewUrl={matchSideCrestUrl(match.id, 'B')}
            hasCrest={match.hasCrestB}
            onUpdated={() => router.refresh()}
          />
        </>
      )}
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-kelme-red px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-kelme-border px-3 py-1 text-xs"
        >
          Cancelar
        </button>
      </span>
      {error && <p className="text-xs text-kelme-red md:col-span-3">{error}</p>}
    </div>
  )
}
