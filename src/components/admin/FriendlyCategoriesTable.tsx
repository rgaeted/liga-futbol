'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type FriendlyCategoryRow = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  playerCount: number
  matchCount: number
}

export function FriendlyCategoriesTable({
  categories,
}: {
  categories: FriendlyCategoryRow[]
}) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(category: FriendlyCategoryRow) {
    setEditingId(category.id)
    setName(category.name)
    setDescription(category.description ?? '')
    setIsActive(category.isActive)
    setError('')
  }

  async function save(categoryId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/friendly-categories/${categoryId}`, 'PUT', {
      name,
      description: description || null,
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
            <th className="p-3">Descripción</th>
            <th className="p-3">Jugadores</th>
            <th className="p-3">Partidos</th>
            <th className="p-3">Activa</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-t border-kelme-border">
              {editingId === category.id ? (
                <>
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
                  <td className="p-3">{category.playerCount}</td>
                  <td className="p-3">{category.matchCount}</td>
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
                        onClick={() => save(category.id)}
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
                  <td className="p-3">{category.name}</td>
                  <td className="p-3 text-kelme-gray-400">{category.description ?? '—'}</td>
                  <td className="p-3">{category.playerCount}</td>
                  <td className="p-3">{category.matchCount}</td>
                  <td className="p-3">{category.isActive ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <a
                        href={`/admin/friendly-players?categoryId=${category.id}`}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Jugadores
                      </a>
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      {category.playerCount === 0 && category.matchCount === 0 && (
                        <DeleteButton
                          url={`/api/friendly-categories/${category.id}`}
                          confirmMessage={`¿Eliminar la categoría ${category.name}?`}
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
