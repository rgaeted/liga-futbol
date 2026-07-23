'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { MatchMvpSide } from '@prisma/client'
import { readApiError } from '@/lib/api-error'
import { personInitials } from '@/lib/player-name'
import type { TeamMvpSideView } from '@/lib/match-mvp'

type SidePickerProps = {
  matchId: string
  matchType: 'LEAGUE' | 'FRIENDLY'
  matchStatus: string
  side: MatchMvpSide
  teamLabel: string
  players: Array<{ id: string; label: string }>
  initial: TeamMvpSideView
  onUpdated: (side: TeamMvpSideView) => void
}

function TeamMvpSidePicker({
  matchId,
  matchType,
  matchStatus,
  side,
  teamLabel,
  players,
  initial,
  onUpdated,
}: SidePickerProps) {
  const photoRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initial.playerId ?? '')
  const [mvp, setMvp] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canEdit = matchStatus === 'FINISHED'
  const hasCustomPhoto = Boolean(mvp.photoUrl?.includes('/mvp/'))

  useEffect(() => {
    setSelectedId(initial.playerId ?? '')
    setMvp(initial)
  }, [initial.playerId, initial.label, initial.photoUrl, initial.teamLabel])

  function applyUpdate(updated: TeamMvpSideView) {
    setSelectedId(updated.playerId ?? '')
    setMvp(updated)
    onUpdated(updated)
    router.refresh()
  }

  async function saveMvp(playerId: string | null) {
    setSaving(true)
    setError('')
    setSuccess('')

    const body =
      matchType === 'FRIENDLY'
        ? { side, friendlyPlayerId: playerId }
        : { side, playerId }

    const res = await fetch(`/api/matches/${matchId}/mvp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (!res.ok) {
      setError(await readApiError(res, 'No se pudo guardar el MVP'))
      return
    }

    const data = await res.json()
    const updated = data.side as TeamMvpSideView
    applyUpdate(updated)
    setSuccess(updated.label ? `MVP guardado: ${updated.label}` : 'MVP eliminado')
  }

  async function uploadPhoto(file: File) {
    setUploading(true)
    setError('')
    setSuccess('')

    const form = new FormData()
    form.append('photo', file)

    const res = await fetch(`/api/matches/${matchId}/mvp/${side.toLowerCase()}/photo`, {
      method: 'POST',
      body: form,
    })

    setUploading(false)
    if (!res.ok) {
      setError(await readApiError(res, 'No se pudo subir la foto'))
      return
    }

    const data = await res.json()
    const updated = (data.teamMvps as TeamMvpSideView[]).find((row) => row.side === side)
    if (updated) applyUpdate(updated)
    setSuccess('Foto del MVP actualizada')
  }

  async function removePhoto() {
    setUploading(true)
    setError('')
    const res = await fetch(`/api/matches/${matchId}/mvp/${side.toLowerCase()}/photo`, {
      method: 'DELETE',
    })
    setUploading(false)
    if (!res.ok) {
      setError(await readApiError(res, 'No se pudo quitar la foto'))
      return
    }
    const data = await res.json()
    const updated = (data.teamMvps as TeamMvpSideView[]).find((row) => row.side === side)
    if (updated) applyUpdate(updated)
    setSuccess('Foto del MVP eliminada')
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200/80 bg-white p-4 shadow-sm">
      <div>
        <h3 className="font-display text-base font-semibold">⭐ MVP — {teamLabel}</h3>
        <p className="text-xs text-kelme-gray-400">Un jugador destacado por equipo</p>
      </div>

      {mvp.label && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 sm:flex-row sm:items-center">
          {mvp.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mvp.photoUrl}
              alt={mvp.label}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-amber-400"
            />
          ) : (
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-amber-200 text-base font-bold text-amber-900 ring-4 ring-amber-400">
              {personInitials(mvp.label)}
            </span>
          )}
          <div className="text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-800/70">MVP actual</p>
            <p className="font-semibold text-amber-950">{mvp.label}</p>
          </div>
        </div>
      )}

      {!canEdit ? (
        <p className="text-sm text-kelme-gray-400">Disponible cuando el partido esté finalizado.</p>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value)
              setSuccess('')
              setError('')
            }}
            className="w-full rounded-lg border border-kelme-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Sin MVP</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || players.length === 0}
              onClick={() => saveMvp(selectedId || null)}
              className="rounded-lg bg-kelme-red px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar MVP'}
            </button>
            {mvp.label && (
              <button
                type="button"
                disabled={saving}
                onClick={() => saveMvp(null)}
                className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Quitar MVP
              </button>
            )}
          </div>

          {mvp.label && (
            <div className="space-y-2 border-t border-kelme-border pt-3">
              <p className="text-sm font-medium text-kelme-gray-900">Foto del MVP</p>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadPhoto(file)
                  e.target.value = ''
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => photoRef.current?.click()}
                  className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  {uploading ? 'Subiendo…' : hasCustomPhoto ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {hasCustomPhoto && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={removePhoto}
                    className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm text-kelme-gray-600 disabled:opacity-50"
                  >
                    Quitar foto
                  </button>
                )}
              </div>
              <p className="text-xs text-kelme-gray-400">
                JPG, PNG o WebP · máx. 500 KB. Si no subes foto, se usa la del jugador (amistoso).
              </p>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-kelme-red">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
    </div>
  )
}

type EditorProps = {
  matchId: string
  matchType: 'LEAGUE' | 'FRIENDLY'
  matchStatus: string
  homeTeam: { label: string; players: Array<{ id: string; label: string }> }
  awayTeam: { label: string; players: Array<{ id: string; label: string }> }
  teamMvps: TeamMvpSideView[]
  compact?: boolean
}

export function MatchTeamMvpEditor({
  matchId,
  matchType,
  matchStatus,
  homeTeam,
  awayTeam,
  teamMvps,
  compact = false,
}: EditorProps) {
  const homeMvp =
    teamMvps.find((m) => m.side === 'HOME') ??
    ({
      side: 'HOME',
      teamLabel: homeTeam.label,
      playerId: null,
      label: null,
      photoUrl: null,
    } satisfies TeamMvpSideView)

  const awayMvp =
    teamMvps.find((m) => m.side === 'AWAY') ??
    ({
      side: 'AWAY',
      teamLabel: awayTeam.label,
      playerId: null,
      label: null,
      photoUrl: null,
    } satisfies TeamMvpSideView)

  return (
    <section className={compact ? 'space-y-4' : 'space-y-5'}>
      <div>
        <h2 className="font-display text-lg font-semibold">MVPs del partido</h2>
        {!compact && (
          <p className="text-sm text-kelme-gray-400">
            Elige un MVP por equipo. Puedes subir una foto dedicada para cada uno.
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TeamMvpSidePicker
          matchId={matchId}
          matchType={matchType}
          matchStatus={matchStatus}
          side="HOME"
          teamLabel={homeTeam.label}
          players={homeTeam.players}
          initial={homeMvp}
          onUpdated={() => undefined}
        />
        <TeamMvpSidePicker
          matchId={matchId}
          matchType={matchType}
          matchStatus={matchStatus}
          side="AWAY"
          teamLabel={awayTeam.label}
          players={awayTeam.players}
          initial={awayMvp}
          onUpdated={() => undefined}
        />
      </div>
    </section>
  )
}
