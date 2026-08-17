'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'
import {
  PlatformPanel,
  platformBtnPrimaryClass,
  platformInputClass,
} from '@/components/plataforma/platform-ui'

type RefereeRow = {
  userId: string
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  organizations: { id: string; slug: string; name: string; status: string }[]
}

type OrganizationRow = {
  id: string
  name: string
  slug: string
  status: string
}

type Props = {
  referees: RefereeRow[]
  organizations: OrganizationRow[]
}

export function PlatformRefereesTable({ referees, organizations }: Props) {
  const router = useRouter()
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [revokingKey, setRevokingKey] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  async function grantAccess(userId: string) {
    const organizationId = selectedOrg[userId]
    if (!organizationId) return
    setError('')
    setLoadingUserId(userId)
    const result = await submitJson(`/api/plataforma/referees/${userId}/access`, 'POST', {
      organizationId,
    })
    setLoadingUserId(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  async function revokeAccess(userId: string, organizationId: string) {
    setError('')
    const key = `${userId}:${organizationId}`
    setRevokingKey(key)
    const res = await fetch(
      `/api/plataforma/referees/${userId}/memberships/${organizationId}`,
      { method: 'DELETE' }
    )
    setRevokingKey(null)
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? 'No pudimos quitar el acceso.')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-[14px] border border-[#ffd8db] bg-[#fff0f1] px-4 py-3 text-sm font-semibold text-[#c91f26]">
          {error}
        </p>
      ) : null}

      <PlatformPanel>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-[#e5e5e9] bg-[#fafafa] text-left text-[#999]">
              <tr>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">Árbitro</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">Contacto</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">
                  Ligas con acceso
                </th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">
                  Dar acceso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f2]">
              {referees.map((referee) => (
                <tr key={referee.userId} className="hover:bg-[#fafafa]">
                  <td className="px-5 py-3.5 align-top">
                    <p className="font-extrabold text-[#17171a]">{referee.name}</p>
                    <p className="text-[#999]">{referee.email}</p>
                  </td>
                  <td className="px-5 py-3.5 align-top text-[#505058]">
                    {referee.phone ?? referee.whatsapp ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 align-top">
                    {referee.organizations.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {referee.organizations.map((org) => {
                          const key = `${referee.userId}:${org.id}`
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
                                disabled={revokingKey === key}
                                onClick={() => void revokeAccess(referee.userId, org.id)}
                                className="font-bold text-[#999] hover:text-[#c91f26] disabled:opacity-50"
                              >
                                Quitar
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <span className="text-[#505058]">Sin acceso</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectedOrg[referee.userId] ?? ''}
                        onChange={(e) =>
                          setSelectedOrg((prev) => ({ ...prev, [referee.userId]: e.target.value }))
                        }
                        className={`${platformInputClass} min-w-[180px] py-2`}
                      >
                        <option value="">Liga</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name} ({org.status === 'ACTIVE' ? 'Activa' : 'Pausada'})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedOrg[referee.userId] || loadingUserId === referee.userId}
                        onClick={() => void grantAccess(referee.userId)}
                        className={platformBtnPrimaryClass}
                      >
                        Dar acceso
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlatformPanel>
    </div>
  )
}
