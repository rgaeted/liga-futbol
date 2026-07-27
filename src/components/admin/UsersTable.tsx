'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type UserRow = {
  id: string
  name: string
  email: string
  role: string
  isFriendlyPlayer?: boolean
  isLeaguePlayer?: boolean
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  COACH: 'DT',
  REFEREE: 'Árbitro',
  PLAYER: 'Jugador',
}

function roleDetail(user: UserRow): string {
  const base = ROLE_LABELS[user.role] ?? user.role
  if (user.role !== 'PLAYER') return base
  if (user.isFriendlyPlayer) return `${base} · amistoso`
  if (user.isLeaguePlayer) return `${base} · liga`
  return base
}

const STAFF_ROLES = ['ADMIN', 'COACH', 'REFEREE'] as const

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('COACH')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setName(user.name)
    setRole(user.role)
    setPassword('')
    setError('')
  }

  async function save(user: UserRow) {
    setSaving(true)
    setError('')
    const payload: Record<string, unknown> = {
      name,
      ...(password ? { password } : {}),
    }
    if (user.role !== 'PLAYER') {
      payload.role = role
    }
    const result = await submitJson(`/api/users/${user.id}`, 'PUT', payload)
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
            <th className="p-3">Rol</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
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
                    {user.role === 'PLAYER' ? (
                      <span className="text-kelme-gray-600">{roleDetail(user)}</span>
                    ) : (
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                      >
                        {STAFF_ROLES.map((value) => (
                          <option key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    )}
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
                  <td className="p-3">{roleDetail(user)}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      {user.id !== currentUserId && user.role !== 'PLAYER' && (
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
