'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FootballFormat } from '@prisma/client'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'
import { FOOTBALL_FORMATS, FOOTBALL_FORMAT_LABELS } from '@/lib/football-format'

export type SeasonRow = {
  id: string
  name: string
  startDate: string
  endDate: string
  footballFormat: FootballFormat
  isActive: boolean
}

export function SeasonsTable({ seasons }: { seasons: SeasonRow[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [footballFormat, setFootballFormat] = useState<FootballFormat>('FUTBOL_11')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(season: SeasonRow) {
    setEditingId(season.id)
    setName(season.name)
    setStartDate(season.startDate)
    setEndDate(season.endDate)
    setFootballFormat(season.footballFormat)
    setIsActive(season.isActive)
    setError('')
  }

  async function save(seasonId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/seasons/${seasonId}`, 'PUT', {
      name,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      footballFormat,
      isActive,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-kelme-surface">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Inicio</th>
            <th className="p-3">Fin</th>
            <th className="p-3">Activa</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((season) => (
            <tr key={season.id} className="border-t border-kelme-border">
              {editingId === season.id ? (
                <>
                  <td className="p-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <select
                      value={footballFormat}
                      onChange={(e) => setFootballFormat(e.target.value as FootballFormat)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    >
                      {FOOTBALL_FORMATS.map((format) => (
                        <option key={format} value={format}>
                          {FOOTBALL_FORMAT_LABELS[format]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => save(season.id)}
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
                      {error && <span className="text-xs text-kelme-red">{error}</span>}
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">{season.name}</td>
                  <td className="p-3">{FOOTBALL_FORMAT_LABELS[season.footballFormat]}</td>
                  <td className="p-3">{season.startDate}</td>
                  <td className="p-3">{season.endDate}</td>
                  <td className="p-3">{season.isActive ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(season)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      <DeleteButton
                        url={`/api/seasons/${season.id}`}
                        confirmMessage={`¿Eliminar la temporada ${season.name}?`}
                      />
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
