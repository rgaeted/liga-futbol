'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BADGE_REGISTRY } from '@/lib/badges/registry'
import { formatApiError } from '@/lib/api-error'
import { DeleteButton } from './DeleteButton'

export type OrgBadgeRow = {
  id: string
  predicateId: string
  name: string
  description: string
  family: string
  rarity: string
  iconKey: string
  thresholds: Record<string, number>
  isActive: boolean
  sortOrder: number
  evaluable: boolean
  playerCount: number
}

type ApiOrgBadge = OrgBadgeRow & {
  _count: { playerBadges: number }
}

async function patchJson(url: string, body: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return { ok: false, message: 'No se pudo conectar con el servidor' }
  }

  if (res.ok) return { ok: true }

  let message = `Error ${res.status}`
  try {
    const data = await res.json()
    if (typeof data?.error === 'string') {
      message = data.error
    } else if (data?.error) {
      message = formatApiError(data.error, message)
    }
  } catch {
    // respuesta sin JSON
  }
  return { ok: false, message }
}

function mapBadgeRows(items: ApiOrgBadge[]): OrgBadgeRow[] {
  return items.map((badge) => ({
    id: badge.id,
    predicateId: badge.predicateId,
    name: badge.name,
    description: badge.description,
    family: badge.family,
    rarity: badge.rarity,
    iconKey: badge.iconKey,
    thresholds: badge.thresholds,
    isActive: badge.isActive,
    sortOrder: badge.sortOrder,
    evaluable: badge.evaluable,
    playerCount: badge._count.playerBadges,
  }))
}

const RARITY_LABELS: Record<string, string> = {
  comun: 'Común',
  raro: 'Raro',
  epico: 'Épico',
  legendario: 'Legendario',
}

export function OrgBadgesAdminSection({
  initialBadges,
  badgesEnabled: initialEnabled,
}: {
  initialBadges: OrgBadgeRow[]
  badgesEnabled: boolean
}) {
  const router = useRouter()
  const [badges, setBadges] = useState(initialBadges)
  const [badgesEnabled, setBadgesEnabled] = useState(initialEnabled)
  const [enabledSaving, setEnabledSaving] = useState(false)
  const [enabledError, setEnabledError] = useState('')
  const [addPredicateId, setAddPredicateId] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editThresholds, setEditThresholds] = useState<Record<string, number>>({})
  const [editIsActive, setEditIsActive] = useState(true)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toggleSavingId, setToggleSavingId] = useState<string | null>(null)

  useEffect(() => {
    setBadges(initialBadges)
  }, [initialBadges])

  useEffect(() => {
    setBadgesEnabled(initialEnabled)
  }, [initialEnabled])

  const reloadBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/org-badges')
      if (!res.ok) return
      const data = (await res.json()) as ApiOrgBadge[]
      setBadges(mapBadgeRows(data))
    } finally {
      router.refresh()
    }
  }, [router])

  const availablePredicateIds = useMemo(() => {
    const existing = new Set(badges.map((b) => b.predicateId))
    return BADGE_REGISTRY.filter((d) => !existing.has(d.predicateId)).map((d) => d.predicateId)
  }, [badges])

  async function toggleEnabled(next: boolean) {
    setEnabledSaving(true)
    setEnabledError('')
    const result = await patchJson('/api/org-badges/settings', { badgesEnabled: next })
    setEnabledSaving(false)
    if (!result.ok) {
      setEnabledError(result.message)
      return
    }
    setBadgesEnabled(next)
    await reloadBadges()
  }

  async function toggleActive(badge: OrgBadgeRow) {
    setToggleSavingId(badge.id)
    const result = await patchJson(`/api/org-badges/${badge.id}`, { isActive: !badge.isActive })
    setToggleSavingId(null)
    if (!result.ok) return
    await reloadBadges()
  }

  function startEdit(badge: OrgBadgeRow) {
    setEditingId(badge.id)
    setEditName(badge.name)
    setEditDescription(badge.description)
    setEditThresholds({ ...badge.thresholds })
    setEditIsActive(badge.isActive)
    setEditError('')
  }

  async function saveEdit(badgeId: string) {
    setSaving(true)
    setEditError('')
    const result = await patchJson(`/api/org-badges/${badgeId}`, {
      name: editName,
      description: editDescription,
      thresholds: editThresholds,
      isActive: editIsActive,
    })
    setSaving(false)
    if (!result.ok) {
      setEditError(result.message)
      return
    }
    setEditingId(null)
    await reloadBadges()
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!addPredicateId) return
    setAdding(true)
    setAddError('')
    let res: Response
    try {
      res = await fetch('/api/org-badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predicateId: addPredicateId }),
      })
    } catch {
      setAdding(false)
      setAddError('No se pudo conectar con el servidor')
      return
    }
    setAdding(false)
    if (!res.ok) {
      let message = `Error ${res.status}`
      try {
        const data = await res.json()
        if (typeof data?.error === 'string') message = data.error
      } catch {
        // sin JSON
      }
      setAddError(message)
      return
    }
    setAddPredicateId('')
    await reloadBadges()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-kelme-border bg-kelme-surface p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Insignias automáticas</p>
            <p className="mt-1 text-sm text-kelme-gray-400">
              Se ganan en la cancha. Los premios del camarín se siguen otorgando a mano en Premios.
            </p>
          </div>
          <input
            type="checkbox"
            checked={badgesEnabled}
            disabled={enabledSaving}
            onChange={(e) => toggleEnabled(e.target.checked)}
            className="h-5 w-5"
          />
        </label>
        {enabledError && <p className="mt-2 text-sm text-kelme-red">{enabledError}</p>}
      </div>

      {badgesEnabled && (
        <>
          <form onSubmit={handleAddSubmit} className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="add-badge" className="mb-1 block text-sm font-medium">
                Añadir insignia
              </label>
              <select
                id="add-badge"
                value={addPredicateId}
                onChange={(e) => setAddPredicateId(e.target.value)}
                className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 text-sm"
              >
                <option value="">Selecciona una insignia…</option>
                {availablePredicateIds.map((id) => {
                  const def = BADGE_REGISTRY.find((d) => d.predicateId === id)
                  return (
                    <option key={id} value={id}>
                      {def?.name ?? id}
                      {!def?.evaluable ? ' (próximamente)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
            <button
              type="submit"
              disabled={!addPredicateId || adding}
              className="rounded-lg bg-kelme-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Añadir
            </button>
            {addError && <p className="w-full text-sm text-kelme-red">{addError}</p>}
          </form>

          {badges.length === 0 ? (
            <p className="text-sm text-kelme-gray-400">
              Aún no hay insignias en el catálogo. Activa el módulo arriba o añade la primera.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-kelme-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-kelme-surface">
                  <tr>
                    <th className="p-3">Insignia</th>
                    <th className="p-3">Rareza</th>
                    <th className="p-3">Umbrales</th>
                    <th className="p-3">Ganadas</th>
                    <th className="p-3">Activa</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {badges.map((badge) => (
                    <tr key={badge.id} className="border-t border-kelme-border">
                      {editingId === badge.id ? (
                        <>
                          <td className="p-3">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="mb-2 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                            />
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                              className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                            />
                          </td>
                          <td className="p-3">{RARITY_LABELS[badge.rarity] ?? badge.rarity}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {Object.keys(editThresholds).map((key) => (
                                <label key={key} className="flex items-center gap-1 text-xs">
                                  <span className="font-mono">{key}</span>
                                  <input
                                    type="number"
                                    value={editThresholds[key]}
                                    onChange={(e) =>
                                      setEditThresholds((prev) => ({
                                        ...prev,
                                        [key]: Number(e.target.value),
                                      }))
                                    }
                                    className="w-16 rounded border border-kelme-border bg-kelme-gray-100 px-1 py-0.5"
                                  />
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">{badge.playerCount}</td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={editIsActive}
                              onChange={(e) => setEditIsActive(e.target.checked)}
                            />
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(badge.id)}
                                disabled={saving}
                                className="rounded-lg bg-kelme-red px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg border border-kelme-border px-2 py-1 text-xs"
                              >
                                Cancelar
                              </button>
                              {editError && (
                                <span className="text-xs text-kelme-red">{editError}</span>
                              )}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{badge.name}</span>
                              {!badge.evaluable && (
                                <span className="rounded-full bg-kelme-gray-200 px-2 py-0.5 text-xs font-semibold text-kelme-gray-600">
                                  Próximamente
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-kelme-gray-400">{badge.description}</p>
                            <p className="mt-1 font-mono text-xs text-kelme-gray-500">
                              {badge.predicateId}
                            </p>
                          </td>
                          <td className="p-3">{RARITY_LABELS[badge.rarity] ?? badge.rarity}</td>
                          <td className="p-3">
                            {Object.keys(badge.thresholds).length === 0 ? (
                              '—'
                            ) : (
                              <span className="font-mono text-xs">
                                {Object.entries(badge.thresholds)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')}
                              </span>
                            )}
                          </td>
                          <td className="p-3">{badge.playerCount}</td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={badge.isActive}
                              disabled={toggleSavingId === badge.id}
                              onChange={() => toggleActive(badge)}
                            />
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(badge)}
                                className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                              >
                                Editar
                              </button>
                              {badge.playerCount === 0 && (
                                <DeleteButton
                                  url={`/api/org-badges/${badge.id}`}
                                  confirmMessage={`¿Eliminar la insignia ${badge.name}?`}
                                  onSuccess={reloadBadges}
                                />
                              )}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
