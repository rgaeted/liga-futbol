'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrgAdminUser } from '@/lib/platform-org-admins'

export function PlatformOrgAdminTable({ users }: { users: OrgAdminUser[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  async function revoke(userId: string, organizationId: string) {
    setError('')
    setPending(`${userId}:${organizationId}`)
    const res = await fetch(
      `/api/plataforma/users/${userId}/memberships/${organizationId}`,
      { method: 'DELETE' },
    )
    setPending(null)
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? 'No pudimos quitar el acceso.')
      return
    }
    router.refresh()
  }

  if (users.length === 0) {
    return (
      <p className="font-ui text-sm text-zinc-500">Aún no hay administradores de empresa.</p>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="font-ui text-sm text-red-600">{error}</p>}
      <section className="rounded-lg border border-zinc-200 bg-white">
        <ul className="divide-y divide-zinc-100">
          {users.map((user) => (
            <li key={user.id} className="space-y-2 px-4 py-4">
              <div>
                <p className="font-ui font-medium text-zinc-900">{user.name}</p>
                <p className="font-ui text-sm text-zinc-500">{user.email}</p>
              </div>
              <ul className="flex flex-wrap gap-2">
                {user.organizations.map((org) => {
                  const key = `${user.id}:${org.id}`
                  return (
                    <li
                      key={org.id}
                      className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-ui text-sm"
                    >
                      <span>
                        {org.name}
                        {org.status === 'PAUSED' ? ' (pausada)' : ''}
                      </span>
                      <button
                        type="button"
                        disabled={pending === key}
                        onClick={() => revoke(user.id, org.id)}
                        className="text-zinc-500 hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
