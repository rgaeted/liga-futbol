'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'
import type { UserRoleTag } from '@/lib/user-roles-display'
import { accessRoles } from '@/lib/validations/user'

export type UserRow = {
  id: string
  name: string
  email: string
  role: string
  roleTags: UserRoleTag[]
}

const ACCESS_ROLE_LABELS: Record<(typeof accessRoles)[number], string> = {
  ORG_ADMIN: 'Admin',
  COACH: 'DT liga',
  REFEREE: 'Árbitro',
  FRIENDLY_COACH: 'DT amistoso',
  PLAYER: 'Jugador',
}

function RoleBadges({ tags }: { tags: UserRoleTag[] }) {
  if (tags.length === 0) {
    return <span className="text-kelme-gray-400">—</span>
  }

  const [primary, ...secondary] = tags

  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className="rounded-full bg-kelme-red/10 px-2 py-0.5 text-xs font-semibold text-kelme-red">
        {primary.label}
      </span>
      {secondary.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full bg-kelme-gray-100 px-2 py-0.5 text-xs text-kelme-gray-600"
        >
          {tag.label}
        </span>
      ))}
    </span>
  )
}

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState<(typeof accessRoles)[number]>('COACH')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setName(user.name)
    setRole(user.role as (typeof accessRoles)[number])
    setPassword('')
    setError('')
  }

  async function save(user: UserRow) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/users/${user.id}`, 'PUT', {
      name,
      role,
      ...(password ? { password } : {}),
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
            <th className="p-3">Email</th>
            <th className="p-3">Roles</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const extraTags = user.roleTags.filter((tag) => {
              if (role === 'ADMIN' && tag.id === 'admin') return false
              if (role === 'COACH' && tag.id === 'coach_league') return false
              if (role === 'REFEREE' && tag.id === 'referee') return false
              if (role === 'PLAYER' && tag.id === 'player') return false
              return true
            })
            const isSelf = user.id === currentUserId

            return (
              <tr key={user.id} className="border-t border-kelme-border">
                {editingId === user.id ? (
                  <>
                    <td className="p-3">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                      />
                    </td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <label className="block text-xs text-kelme-gray-500">
                          Rol de acceso
                          <select
                            value={role}
                            onChange={(e) =>
                              setRole(e.target.value as (typeof accessRoles)[number])
                            }
                            disabled={isSelf}
                            className="mt-1 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1 disabled:opacity-60"
                          >
                            {accessRoles.map((value) => (
                              <option key={value} value={value}>
                                {ACCESS_ROLE_LABELS[value]}
                              </option>
                            ))}
                          </select>
                        </label>
                        {isSelf && (
                          <p className="text-xs text-kelme-gray-400">
                            No puedes cambiar tu propio rol de acceso.
                          </p>
                        )}
                        {extraTags.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs text-kelme-gray-500">
                              También en el torneo (según datos vinculados):
                            </p>
                            <RoleBadges tags={extraTags} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Nueva contraseña (opcional)"
                          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => save(user)}
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
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <RoleBadges tags={user.roleTags} />
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                        >
                          Editar
                        </button>
                        {!isSelf && user.role !== 'PLAYER' && (
                          <DeleteButton
                            url={`/api/users/${user.id}`}
                            confirmMessage={`¿Eliminar al usuario ${user.name}?`}
                          />
                        )}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
