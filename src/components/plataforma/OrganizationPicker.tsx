'use client'

import type { MembershipRole } from '@/lib/membership-role'

type MembershipOption = {
  organizationId: string
  name: string
  slug: string
  role: MembershipRole
}

export function OrganizationPicker({ memberships }: { memberships: MembershipOption[] }) {
  async function selectOrganization(organizationId: string) {
    const res = await fetch('/api/me/organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    })
    if (!res.ok) return
    const { path } = (await res.json()) as { path: string }
    window.location.assign(path)
  }

  if (memberships.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white p-6 text-center font-ui text-sm text-zinc-600">
        No tienes empresas activas disponibles.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
      {memberships.map((m) => (
        <li key={m.organizationId}>
          <button
            type="button"
            onClick={() => selectOrganization(m.organizationId)}
            className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-zinc-50"
          >
            <span>
              <span className="block font-ui font-medium text-zinc-900">{m.name}</span>
              <span className="block font-ui text-sm text-zinc-500">/{m.slug}</span>
            </span>
            <span className="font-ui text-sm text-zinc-400">Ingresar</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
