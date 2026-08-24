'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell'
import { OrganizationSwitcher } from '@/components/tenant/OrganizationSwitcher'
import type { DashboardNavGroup } from '@/components/dashboard/dashboard-ui'

type Props = {
  navGroups: DashboardNavGroup[]
  userName: string
  organizationName: string
  organizationSlug: string
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

export function AdminShell({
  navGroups,
  userName,
  organizationName,
  organizationSlug,
  signOutAction,
  children,
}: Props) {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => setIsPlatformAdmin(Boolean(data?.user?.isPlatformAdmin)))
      .catch(() => setIsPlatformAdmin(false))
  }, [])

  return (
    <DashboardAppShell
      brandMark={organizationName.slice(0, 1).toUpperCase()}
      brandTitle={organizationName}
      brandSubtitle="LigaLab · Administrador"
      userName={userName}
      roleLabel="Administrador"
      navGroups={navGroups}
      signOutAction={signOutAction}
      markClassName="bg-org-primary"
      topActions={
        <>
          <OrganizationSwitcher />
          {isPlatformAdmin ? (
            <Link
              href="/plataforma"
              className="hidden rounded-xl border border-[#2A3A32] bg-transparent px-3.5 py-2.5 text-sm font-bold text-[#E8E4D8] hover:bg-[#0B1210] sm:inline-flex"
            >
              Plataforma
            </Link>
          ) : null}
          <Link
            href={`/${organizationSlug}/ayuda`}
            className="hidden rounded-xl border border-[#2A3A32] bg-transparent px-3.5 py-2.5 text-sm font-bold text-[#E8E4D8] hover:bg-[#0B1210] sm:inline-flex"
          >
            Ayuda
          </Link>
        </>
      }
    >
      {children}
    </DashboardAppShell>
  )
}
