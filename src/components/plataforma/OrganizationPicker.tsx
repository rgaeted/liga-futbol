'use client'

import { useSession } from 'next-auth/react'
import { membershipRoleLabel } from '@/lib/membership-role'
import type { MembershipRole } from '@/lib/membership-role'

type MembershipOption = {
  organizationId: string
  name: string
  slug: string
  role: MembershipRole
}

export function OrganizationPicker({ memberships }: { memberships: MembershipOption[] }) {
  const { update } = useSession()

  async function selectOrganization(organizationId: string) {
    const target = memberships.find((m) => m.organizationId === organizationId)
    if (!target) return

    const res = await fetch('/api/me/organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    })
    if (!res.ok) return
    const { path } = (await res.json()) as { path: string }

    await update({
      membershipRole: target.role,
      activeOrganizationId: target.organizationId,
      activeOrganizationSlug: target.slug,
    })

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
    <ul className="divide-y divide-[#ececef] rounded-[14px] border border-[#e5e5e9] bg-white">
      {memberships.map((m) => (
        <li key={m.organizationId}>
          <button
            type="button"
            onClick={() => selectOrganization(m.organizationId)}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-[#fafafa]"
          >
            <span className="min-w-0">
              <span className="block truncate font-ui font-bold text-[#17171a]">{m.name}</span>
              <span className="mt-0.5 block font-ui text-sm text-[#8d8d96]">
                /{m.slug} · {membershipRoleLabel(m.role)}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-[#fff0f1] px-3 py-1 font-ui text-xs font-bold text-[#c91f26]">
              Ingresar
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
