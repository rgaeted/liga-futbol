'use client'

import { useEffect, useState } from 'react'
import { getDashboardPath } from '@/lib/membership-role'
import type { MembershipRole } from '@/lib/membership-role'
import { organizationSlugFromPath } from '@/lib/post-login-redirect'

type MembershipOption = {
  organizationId: string
  slug: string
  name: string
  role: MembershipRole
}

export function OrganizationSwitcher() {
  const [memberships, setMemberships] = useState<MembershipOption[]>([])
  const [currentSlug, setCurrentSlug] = useState<string | null>(null)

  useEffect(() => {
    setCurrentSlug(organizationSlugFromPath(window.location.pathname))

    fetch('/api/me/memberships')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: MembershipOption[]) => setMemberships(data))
      .catch(() => setMemberships([]))
  }, [])

  if (memberships.length <= 1) return null

  async function handleChange(organizationId: string) {
    const target = memberships.find((m) => m.organizationId === organizationId)
    if (!target) return

    const res = await fetch('/api/me/organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    })
    if (!res.ok) return
    const { path } = (await res.json()) as { path: string }
    window.location.assign(path || getDashboardPath(target.slug, target.role))
  }

  return (
    <label className="hidden items-center gap-2 sm:flex">
      <span className="font-ui text-xs text-zinc-400">Empresa</span>
      <select
        className="h-[38px] max-w-[180px] rounded-[9px] border border-zinc-200 bg-white px-2 font-ui text-[13px] text-zinc-700"
        value={memberships.find((m) => m.slug === currentSlug)?.organizationId ?? ''}
        onChange={(e) => handleChange(e.target.value)}
      >
        {memberships.map((m) => (
          <option key={m.organizationId} value={m.organizationId}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  )
}
