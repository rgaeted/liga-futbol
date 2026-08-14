'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'

type RefereeRow = {
  userId: string
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  organizations: { id: string; slug: string; name: string }[]
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

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Árbitro</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Contacto</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Organizaciones</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Dar acceso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {referees.map((referee) => (
              <tr key={referee.userId}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{referee.name}</p>
                  <p className="text-zinc-500">{referee.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {referee.phone ?? referee.whatsapp ?? '—'}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {referee.organizations.length > 0
                    ? referee.organizations.map((org) => org.name).join(', ')
                    : 'Sin acceso'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedOrg[referee.userId] ?? ''}
                      onChange={(e) =>
                        setSelectedOrg((prev) => ({ ...prev, [referee.userId]: e.target.value }))
                      }
                      className="rounded border border-zinc-300 px-2 py-1"
                    >
                      <option value="">Organización</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.status === 'ACTIVE' ? 'Activa' : 'Pausada'})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedOrg[referee.userId] || loadingUserId === referee.userId}
                      onClick={() => grantAccess(referee.userId)}
                      className="rounded bg-zinc-900 px-3 py-1 text-white hover:bg-zinc-800 disabled:opacity-50"
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
    </div>
  )
}
