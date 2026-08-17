'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrgAdminUser } from '@/lib/platform-org-admins'
import { PlatformPanel, PlatformPanelInner } from '@/components/plataforma/platform-ui'

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

  return (
    <PlatformPanel>
      <PlatformPanelInner>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-black text-[#17171a]">Administradores</h2>
          <span className="text-xs text-[#aaa]">{users.length} cuentas</span>
        </div>

        {error && <p className="mb-3 text-sm font-semibold text-[#c91f26]">{error}</p>}

        {users.length === 0 ? (
          <p className="text-sm text-[#8e8e98]">Aún no hay administradores de empresa.</p>
        ) : (
          <ul className="divide-y divide-[#f0f0f2]">
            {users.map((user) => (
              <li key={user.id} className="space-y-2.5 py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#1a1a1a] text-[10px] font-black text-white">
                    {user.name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part.charAt(0))
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[#17171a]">{user.name}</p>
                    <p className="text-xs text-[#999]">{user.email}</p>
                  </div>
                </div>
                <ul className="flex flex-wrap gap-2 pl-[46px]">
                  {user.organizations.map((org) => {
                    const key = `${user.id}:${org.id}`
                    return (
                      <li
                        key={org.id}
                        className="flex items-center gap-2 rounded-full border border-[#e5e5e9] bg-[#fafafa] px-3 py-1 text-xs font-semibold text-[#505058]"
                      >
                        <span>
                          {org.name}
                          {org.status === 'PAUSED' ? ' (pausada)' : ''}
                        </span>
                        <button
                          type="button"
                          disabled={pending === key}
                          onClick={() => revoke(user.id, org.id)}
                          className="font-bold text-[#999] hover:text-[#c91f26] disabled:opacity-50"
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
        )}
      </PlatformPanelInner>
    </PlatformPanel>
  )
}
