'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EmojiPickerField } from '@/components/ui/EmojiPickerField'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type OrgAwardRow = {
  id: string
  name: string
  shortLabel: string
  emoji: string
  description: string | null
  accentColor: string | null
  sortOrder: number
  isActive: boolean
  playerCount: number
}

function AwardPreviewChip({
  emoji,
  shortLabel,
  accentColor,
}: {
  emoji: string
  shortLabel: string
  accentColor: string | null
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={
        accentColor
          ? {
              borderColor: accentColor,
              backgroundColor: `${accentColor}22`,
              color: accentColor,
            }
          : undefined
      }
    >
      <span aria-hidden>{emoji}</span>
      {shortLabel}
    </span>
  )
}

export function OrgAwardsTable({ awards }: { awards: OrgAwardRow[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [shortLabel, setShortLabel] = useState('')
  const [emoji, setEmoji] = useState('')
  const [description, setDescription] = useState('')
  const [accentColor, setAccentColor] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(award: OrgAwardRow) {
    setEditingId(award.id)
    setName(award.name)
    setShortLabel(award.shortLabel)
    setEmoji(award.emoji)
    setDescription(award.description ?? '')
    setAccentColor(award.accentColor ?? '')
    setSortOrder(String(award.sortOrder))
    setIsActive(award.isActive)
    setError('')
  }

  async function save(awardId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/org-awards/${awardId}`, 'PUT', {
      name,
      shortLabel,
      emoji,
      description: description || null,
      accentColor: accentColor || null,
      sortOrder: Number(sortOrder),
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

  if (awards.length === 0) {
    return (
      <p className="text-sm text-kelme-gray-400">
        Aún no hay premios definidos. Crea el primero arriba.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-kelme-surface">
          <tr>
            <th className="p-3">Vista previa</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Descripción</th>
            <th className="p-3">Orden</th>
            <th className="p-3">Otorgados</th>
            <th className="p-3">Activo</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {awards.map((award) => (
            <tr key={award.id} className="border-t border-kelme-border">
              {editingId === award.id ? (
                <>
                  <td className="p-3">
                    <AwardPreviewChip
                      emoji={emoji}
                      shortLabel={shortLabel || '…'}
                      accentColor={accentColor || null}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={0}
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-16 rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">{award.playerCount}</td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={shortLabel}
                          onChange={(e) => setShortLabel(e.target.value)}
                          placeholder="Etiqueta"
                          className="w-24 rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                        />
                        <div className="w-40">
                          <EmojiPickerField
                            value={emoji}
                            onChange={setEmoji}
                            compact
                            inputClassName="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                          />
                        </div>
                        <input
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="#16A34A"
                          className="w-24 rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1 font-mono text-xs"
                        />
                      </div>
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => save(award.id)}
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
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">
                    <AwardPreviewChip
                      emoji={award.emoji}
                      shortLabel={award.shortLabel}
                      accentColor={award.accentColor}
                    />
                  </td>
                  <td className="p-3">{award.name}</td>
                  <td className="p-3 text-kelme-gray-400">{award.description ?? '—'}</td>
                  <td className="p-3">{award.sortOrder}</td>
                  <td className="p-3">{award.playerCount}</td>
                  <td className="p-3">{award.isActive ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(award)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      {award.playerCount === 0 && (
                        <DeleteButton
                          url={`/api/org-awards/${award.id}`}
                          confirmMessage={`¿Eliminar el premio ${award.name}?`}
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
  )
}
