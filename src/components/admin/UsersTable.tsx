'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'
import type { UserRoleTag } from '@/lib/user-roles-display'
import { assignableRoles } from '@/lib/validations/user'

export type UserRow = {
  id: string
  name: string
  email: string
  roles: string[]
  roleTags: UserRoleTag[]
}

const ASSIGNABLE_ROLE_LABELS: Record<(typeof assignableRoles)[number], string> = {
  ORG_ADMIN: 'Admin',
  COACH: 'DT liga',
  REFEREE: 'Árbitro',
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
  const [roles, setRoles] = useState<(typeof assignableRoles)[number][]>(['COACH'])
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setName(user.name)
    setRoles(
      user.roles.filter((role): role is (typeof assignableRoles)[number] =>
        (assignableRoles as readonly string[]).includes(role),
      ),
    )
    setPassword('')
    setError('')
  }

  function toggleRole(role: (typeof assignableRoles)[number]) {
    setRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
    )
  }

  async function save(user: UserRow) {
    if (roles.length === 0) {
      setError('Debes elegir al menos un rol')
      return
    }
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/users/${user.id}`, 'PUT', {
      name,
      roles,
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
            const isSelf = user.id === currentUserId
            const autoTags = user.roleTags.filter((tag) => tag.id === 'coach_friendly')

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
                        <fieldset className="space-y-1">
                          <legend className="text-xs text-kelme-gray-500">Roles de acceso</legend>
                          {assignableRoles.map((value) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={roles.includes(value)}
                                onChange={() => toggleRole(value)}
                                disabled={isSelf && value === 'ORG_ADMIN'}
                              />
                              {ASSIGNABLE_ROLE_LABELS[value]}
                            </label>
                          ))}
                        </fieldset>
                        {isSelf && (
                          <p className="text-xs text-kelme-gray-400">
                            No puedes quitarte tu propio rol de administrador.
                          </p>
                        )}
                        {autoTags.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs text-kelme-gray-500">
                              Roles automáticos (no editables):
                            </p>
                            <RoleBadges tags={autoTags} />
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
                        {!isSelf && !user.roles.includes('PLAYER') && (
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
