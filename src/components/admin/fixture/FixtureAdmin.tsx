'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { readApiError } from '@/lib/api-error'
import type { FixtureView, FixtureViewMatch, FixtureViewTable } from '@/lib/kelme-fixture/view'
import type { FixtureStatus } from '@/lib/kelme-fixture/types'

type AuditEntry = {
  id: string
  action: string
  reason: string | null
  matchId: string | null
  userName: string | null
  before: unknown
  after: unknown
  createdAt: string
}

const STATUS_LABELS: Record<FixtureStatus, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En juego',
  FINAL: 'Finalizado',
  CANCELLED: 'Anulado',
}

const ACTION_LABELS: Record<string, string> = {
  RESULT: 'Resultado',
  AUTO_ASSIGN: 'Cruce automático',
  FORCE_ASSIGN: 'Corrección del cuadro',
  RANKING: 'Desempate manual',
  CONFIG: 'Configuración',
  TEAM_RENAME: 'Nombre de equipo',
}

const inputClass =
  'w-full rounded-lg border border-kelme-border bg-transparent px-3 py-2 text-sm focus:border-kelme-red focus:outline-none'
const buttonClass =
  'rounded-lg bg-kelme-red px-3 py-2 text-sm font-semibold text-white hover:bg-kelme-red-dark disabled:opacity-50'
const ghostButtonClass =
  'rounded-lg border border-kelme-border px-3 py-2 text-sm hover:border-kelme-red disabled:opacity-50'

export function FixtureAdmin({
  initialView,
  initialAudit,
}: {
  initialView: FixtureView
  initialAudit: AuditEntry[]
}) {
  const router = useRouter()
  const [view, setView] = useState(initialView)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const call = useCallback(
    async (url: string, method: string, body: unknown, success: string): Promise<boolean> => {
      setNotice(null)
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          setNotice({ tone: 'error', text: await readApiError(res, 'No se pudo guardar.') })
          return false
        }
        const data = (await res.json()) as { view: FixtureView }
        setView(data.view)
        setNotice({ tone: 'ok', text: success })
        router.refresh()
        return true
      } catch {
        setNotice({ tone: 'error', text: 'Sin conexión. Inténtalo de nuevo.' })
        return false
      }
    },
    [router],
  )

  const base = `/api/admin/fixture/${view.seasonId}`
  const blocks = useMemo(() => {
    const groups = new Map<string, FixtureViewMatch[]>()
    for (const match of view.matches) {
      groups.set(match.startAt, [...(groups.get(match.startAt) ?? []), match])
    }
    return [...groups.entries()]
  }, [view.matches])

  const teams = useMemo(() => {
    const map = new Map<string, { id: string; name: string; table: string }>()
    for (const table of view.tables) {
      for (const row of table.rows) map.set(row.teamId, { id: row.teamId, name: row.name, table: table.title })
    }
    return [...map.values()]
  }, [view.tables])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Fixture · {view.seasonName}</h1>
        <p className="mt-1 text-sm text-kelme-gray-600">
          Carga resultados, revisa las tablas y los cruces de definición se arman solos cuando los
          dos grupos terminan.
        </p>
      </div>

      {notice ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            notice.tone === 'ok'
              ? 'border-emerald-500/40 text-emerald-400'
              : 'border-red-500/40 text-red-400'
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {view.definitions.conflict ? (
        <ConflictBanner
          message={view.definitions.conflict.message}
          codes={view.definitions.conflict.codes}
          onReassign={(reason) => call(`${base}/reassign`, 'POST', { reason }, 'Cuadro corregido.')}
        />
      ) : null}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Partidos</h2>
        {blocks.map(([startAt, matches]) => (
          <div key={startAt} className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-kelme-gray-600">
              {matches[0].timeLabel}
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {matches.map((match) => (
                <MatchEditor
                  key={`${match.id}:${match.updatedAt}`}
                  match={match}
                  drawPolicy={view.config.definitionDrawPolicy}
                  onSave={(payload, success) =>
                    call(`${base}/matches/${match.id}`, 'PATCH', { ...payload, expectedUpdatedAt: match.updatedAt }, success)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Tablas de posiciones</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {view.tables.map((table) => (
            <StandingsTable
              key={table.key}
              table={table}
              manual={view.config.manualRanking[table.key]}
              onSaveRanking={(teamIds, reason) =>
                call(`${base}/ranking`, 'PUT', { table: table.key, teamIds, reason }, 'Desempate registrado.')
              }
              onClearRanking={(reason) =>
                call(`${base}/ranking`, 'DELETE', { table: table.key, reason }, 'Desempate manual retirado.')
              }
            />
          ))}
        </div>
      </section>

      {view.positions.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Posiciones finales · 2017–2016</h2>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {view.positions.map((p) => (
              <li key={`${p.position}-${p.teamId}`} className="rounded-lg border border-kelme-border px-3 py-2 text-sm">
                <strong>{p.position}.º</strong> {p.name}
                {p.tied ? <span className="ml-2 text-xs text-kelme-gray-600">(empate)</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Reglas de definición</h2>
        <label className="block max-w-md space-y-1 text-sm">
          <span className="text-kelme-gray-600">Si un partido de definición termina empatado</span>
          <select
            className={inputClass}
            value={view.config.definitionDrawPolicy}
            onChange={(event) =>
              call(
                `${base}/config`,
                'PATCH',
                { definitionDrawPolicy: event.target.value },
                'Regla actualizada.',
              )
            }
          >
            <option value="PENALTIES_REQUIRED">Se define por penales (obligatorio)</option>
            <option value="DRAW_ALLOWED">Se permite el empate (puesto compartido)</option>
          </select>
        </label>
        <p className="text-xs text-kelme-gray-600">
          Los criterios de desempate y esta regla deben estar aprobados por la organización antes de
          iniciar el torneo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Equipos</h2>
        <p className="text-sm text-kelme-gray-600">
          Cambia aquí los nombres provisionales («Equipo nuevo A» y «Equipo nuevo B») cuando se
          confirmen.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {teams.map((team) => (
            <TeamRename
              key={`${team.id}:${team.name}`}
              name={team.name}
              hint={team.table}
              onSave={(name) => call(`${base}/teams/${team.id}`, 'PATCH', { name }, 'Nombre actualizado.')}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Historial de cambios</h2>
        {initialAudit.length === 0 ? (
          <p className="text-sm text-kelme-gray-600">Aún no hay cambios registrados.</p>
        ) : (
          <ul className="space-y-2">
            {initialAudit.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-kelme-border px-3 py-2 text-xs">
                <p>
                  <strong>{ACTION_LABELS[entry.action] ?? entry.action}</strong>
                  {' · '}
                  {new Date(entry.createdAt).toLocaleString('es-CL')}
                  {entry.userName ? ` · ${entry.userName}` : ''}
                </p>
                <p className="mt-1 break-words text-kelme-gray-600">
                  {JSON.stringify(entry.before)} → {JSON.stringify(entry.after)}
                </p>
                {entry.reason ? <p className="mt-1">Motivo: {entry.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ConflictBanner({
  message,
  codes,
  onReassign,
}: {
  message: string
  codes: string[]
  onReassign: (reason: string) => Promise<boolean>
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div role="alert" className="space-y-3 rounded-lg border border-amber-500/50 p-4 text-sm">
      <p className="font-semibold text-amber-400">Conflicto en el cuadro ({codes.join(', ')})</p>
      <p>{message}</p>
      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Motivo de la corrección"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <button
          type="button"
          className={buttonClass}
          disabled={busy || reason.trim().length < 3}
          onClick={async () => {
            if (!window.confirm('¿Reasignar los equipos de las definiciones según las tablas actuales?')) return
            setBusy(true)
            await onReassign(reason)
            setBusy(false)
          }}
        >
          Reasignar cruces
        </button>
      </div>
    </div>
  )
}

function MatchEditor({
  match,
  drawPolicy,
  onSave,
}: {
  match: FixtureViewMatch
  drawPolicy: 'PENALTIES_REQUIRED' | 'DRAW_ALLOWED'
  onSave: (
    payload: {
      status: FixtureStatus
      homeGoals: number | null
      awayGoals: number | null
      penaltyHome: number | null
      penaltyAway: number | null
      confirmFinal: boolean
      reason: string
    },
    success: string,
  ) => Promise<boolean>
}) {
  const definition =
    match.phase === 'FINAL' || match.phase === 'THIRD_PLACE' || match.phase === 'FIFTH_PLACE'
  const ready = !match.home.pending && !match.away.pending
  const wasFinal = match.status === 'FINAL'

  const [status, setStatus] = useState<FixtureStatus>(match.status)
  const [home, setHome] = useState(ready && match.status !== 'SCHEDULED' ? String(match.homeGoals) : '')
  const [away, setAway] = useState(ready && match.status !== 'SCHEDULED' ? String(match.awayGoals) : '')
  const [penHome, setPenHome] = useState(match.penaltyHome != null ? String(match.penaltyHome) : '')
  const [penAway, setPenAway] = useState(match.penaltyAway != null ? String(match.penaltyAway) : '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const num = (value: string) => (value.trim() === '' ? null : Number(value))
  const drawn = home !== '' && home === away
  const showPenalties = definition && (drawn || penHome !== '' || penAway !== '')

  return (
    <article className="space-y-3 rounded-lg border border-kelme-border p-4">
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs text-kelme-gray-600">
        <span>
          <strong className="text-kelme-gray-900">{match.code}</strong> · Cancha {match.court} ·{' '}
          {match.category.replace('-', '–')} · {match.phaseLabel}
        </span>
        <span>{STATUS_LABELS[match.status]}</span>
      </header>

      <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2 text-sm">
        <span className={`text-right font-semibold ${match.home.pending ? 'text-kelme-gray-600' : ''}`}>
          {match.home.name}
        </span>
        <input
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          aria-label={`Goles de ${match.home.name}`}
          className={`${inputClass} w-16 text-center`}
          value={home}
          disabled={!ready || status === 'SCHEDULED' || status === 'CANCELLED'}
          onChange={(event) => setHome(event.target.value)}
        />
        <span>–</span>
        <input
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          aria-label={`Goles de ${match.away.name}`}
          className={`${inputClass} w-16 text-center`}
          value={away}
          disabled={!ready || status === 'SCHEDULED' || status === 'CANCELLED'}
          onChange={(event) => setAway(event.target.value)}
        />
        <span className={`font-semibold ${match.away.pending ? 'text-kelme-gray-600' : ''}`}>
          {match.away.name}
        </span>
      </div>

      {showPenalties ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-xs text-kelme-gray-600">
            Penales{drawPolicy === 'PENALTIES_REQUIRED' ? ' (obligatorio si empatan)' : ''}
          </span>
          <input
            type="number"
            min={0}
            max={99}
            aria-label="Penales local"
            className={`${inputClass} w-14 text-center`}
            value={penHome}
            onChange={(event) => setPenHome(event.target.value)}
          />
          <span>–</span>
          <input
            type="number"
            min={0}
            max={99}
            aria-label="Penales visita"
            className={`${inputClass} w-14 text-center`}
            value={penAway}
            onChange={(event) => setPenAway(event.target.value)}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${inputClass} w-auto`}
          aria-label="Estado del partido"
          value={status}
          disabled={!ready}
          onChange={(event) => setStatus(event.target.value as FixtureStatus)}
        >
          {(Object.keys(STATUS_LABELS) as FixtureStatus[]).map((key) => (
            <option key={key} value={key}>
              {STATUS_LABELS[key]}
            </option>
          ))}
        </select>
        {wasFinal ? (
          <input
            className={`${inputClass} min-w-40 flex-1`}
            placeholder="Motivo de la corrección"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        ) : null}
        <button
          type="button"
          className={buttonClass}
          disabled={busy || !ready}
          onClick={async () => {
            if (status === 'FINAL') {
              const label = `${match.home.name} ${home} – ${away} ${match.away.name}`
              if (!window.confirm(`¿Cerrar el partido como definitivo?\n${label}`)) return
            }
            setBusy(true)
            await onSave(
              {
                status,
                homeGoals: num(home),
                awayGoals: num(away),
                penaltyHome: showPenalties ? num(penHome) : null,
                penaltyAway: showPenalties ? num(penAway) : null,
                confirmFinal: status === 'FINAL',
                reason,
              },
              status === 'FINAL' ? 'Resultado guardado y tablas actualizadas.' : 'Partido actualizado.',
            )
            setBusy(false)
          }}
        >
          {status === 'FINAL' ? 'Cerrar partido' : 'Guardar'}
        </button>
      </div>

      {!ready ? (
        <p className="text-xs text-kelme-gray-600">
          Los equipos se asignan solos cuando los dos grupos terminan y no hay empates pendientes.
        </p>
      ) : null}
    </article>
  )
}

function StandingsTable({
  table,
  manual,
  onSaveRanking,
  onClearRanking,
}: {
  table: FixtureViewTable
  manual: { teamIds: string[]; reason: string } | undefined
  onSaveRanking: (teamIds: string[], reason: string) => Promise<boolean>
  onClearRanking: (reason: string) => Promise<boolean>
}) {
  const tied = table.rows.filter((row) => row.tied)
  const [order, setOrder] = useState<string[]>(() => tied.map((row) => row.teamId))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const nameOf = (id: string) => table.rows.find((row) => row.teamId === id)?.name ?? id

  const move = (index: number, delta: number) => {
    const next = [...order]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  return (
    <div className="space-y-3 rounded-lg border border-kelme-border p-4">
      <h3 className="text-sm font-bold">{table.title}</h3>
      <table className="w-full text-xs">
        <thead className="text-kelme-gray-600">
          <tr>
            <th className="text-left">#</th>
            <th className="text-left">Equipo</th>
            <th>PJ</th>
            <th>DG</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.teamId} className="border-t border-kelme-border">
              <td className="py-1">{row.tied ? `${row.rank}*` : row.rank}</td>
              <td>{row.name}</td>
              <td className="text-center">{row.pj}</td>
              <td className="text-center">{row.dg > 0 ? `+${row.dg}` : row.dg}</td>
              <td className="text-center font-bold">{row.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-kelme-gray-600">
        {table.definitive
          ? 'Clasificación definitiva.'
          : table.pendingTie
            ? 'Pendiente de desempate.'
            : 'Clasificación provisoria.'}
      </p>

      {table.pendingTie && tied.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-amber-500/50 p-3">
          <p className="text-xs font-semibold text-amber-400">
            Empate sin criterio resolutivo: define el orden (de mejor a peor) según el reglamento.
          </p>
          <ol className="space-y-1">
            {order.map((id, index) => (
              <li key={id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {index + 1}. {nameOf(id)}
                </span>
                <span className="flex gap-1">
                  <button type="button" className={ghostButtonClass} onClick={() => move(index, -1)} aria-label="Subir">
                    ↑
                  </button>
                  <button type="button" className={ghostButtonClass} onClick={() => move(index, 1)} aria-label="Bajar">
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <input
            className={inputClass}
            placeholder="Motivo (ej. sorteo reglamentario)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <button
            type="button"
            className={buttonClass}
            disabled={busy || reason.trim().length < 3}
            onClick={async () => {
              setBusy(true)
              await onSaveRanking(order, reason)
              setBusy(false)
            }}
          >
            Registrar desempate
          </button>
        </div>
      ) : null}

      {manual ? (
        <div className="space-y-2 text-xs">
          <p>Desempate manual aplicado: {manual.reason}</p>
          <button
            type="button"
            className={ghostButtonClass}
            disabled={busy}
            onClick={async () => {
              const why = window.prompt('Motivo para retirar el desempate manual')
              if (!why || why.trim().length < 3) return
              setBusy(true)
              await onClearRanking(why)
              setBusy(false)
            }}
          >
            Retirar desempate manual
          </button>
        </div>
      ) : null}
    </div>
  )
}

function TeamRename({
  name,
  hint,
  onSave,
}: {
  name: string
  hint: string
  onSave: (name: string) => Promise<boolean>
}) {
  const [value, setValue] = useState(name)
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-lg border border-kelme-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <input
          className={inputClass}
          aria-label={`Nombre de ${name}`}
          value={value}
          maxLength={60}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="mt-1 text-[11px] text-kelme-gray-600">{hint}</p>
      </div>
      <button
        type="button"
        className={ghostButtonClass}
        disabled={busy || value.trim() === name || value.trim().length < 2}
        onClick={async () => {
          setBusy(true)
          await onSave(value)
          setBusy(false)
        }}
      >
        Guardar
      </button>
    </div>
  )
}
