'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { getDashboardPath, membershipRoleLabel } from '@/lib/membership-role'
import type { MembershipRole } from '@/lib/membership-role'
import { organizationSlugFromPath } from '@/lib/post-login-redirect'

type MembershipOption = {
  organizationId: string
  slug: string
  name: string
  role: MembershipRole
}

export function OrganizationSwitcher() {
  const pathname = usePathname()
  const { update } = useSession()
  const [memberships, setMemberships] = useState<MembershipOption[]>([])
  const currentSlug = organizationSlugFromPath(pathname)

  useEffect(() => {
    fetch('/api/me/memberships')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: MembershipOption[]) => setMemberships(data))
      .catch(() => setMemberships([]))
  }, [])

  if (memberships.length <= 1) return null

  const current = memberships.find((m) => m.slug === currentSlug)

  async function handleChange(organizationId: string) {
    const target = memberships.find((m) => m.organizationId === organizationId)
    if (!target || target.slug === currentSlug) return

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

    window.location.assign(path || getDashboardPath(target.slug, target.role))
  }

  return (
    <div className="flex max-w-[min(100%,280px)] items-center gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="sr-only">Cambiar empresa</span>
        <select
          className="h-[38px] min-w-0 max-w-full flex-1 truncate rounded-xl border border-[#dddde2] bg-white px-2.5 font-ui text-[13px] font-semibold text-[#34343a]"
          value={current?.organizationId ?? ''}
          onChange={(e) => void handleChange(e.target.value)}
          aria-label="Empresa activa"
        >
          {memberships.map((m) => (
            <option key={m.organizationId} value={m.organizationId}>
              {m.name} · {membershipRoleLabel(m.role)}
            </option>
          ))}
        </select>
      </label>
      <Link
        href="/organizaciones"
        className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-[#8d8d96] hover:bg-[#f7f7f9] hover:text-[#17171a]"
        title="Ver todas tus empresas"
      >
        Todas
      </Link>
    </div>
  )
}
