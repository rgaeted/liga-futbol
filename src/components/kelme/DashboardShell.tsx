'use client'

import Link from 'next/link'
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell'
import {
  flatNavToGroup,
  type DashboardNavGroup,
} from '@/components/dashboard/dashboard-ui'
import { OrganizationSwitcher } from '@/components/tenant/OrganizationSwitcher'

type NavItem = { href: string; label: string; icon?: string }

type Props = {
  nav: NavItem[]
  navGroupLabel: string
  organizationName: string
  userName: string
  roleLabel: string
  helpHref?: string
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

export function DashboardShell({
  nav,
  navGroupLabel,
  organizationName,
  userName,
  roleLabel,
  helpHref,
  signOutAction,
  children,
}: Props) {
  const navGroups: DashboardNavGroup[] = [flatNavToGroup(navGroupLabel, nav)]

  return (
    <DashboardAppShell
      brandMark={organizationName.slice(0, 1).toUpperCase()}
      brandTitle={organizationName}
      brandSubtitle={`LigaLab · ${roleLabel}`}
      userName={userName}
      roleLabel={roleLabel}
      navGroups={navGroups}
      signOutAction={signOutAction}
      markClassName="bg-org-primary"
      topActions={
        <>
          <OrganizationSwitcher />
          {helpHref ? (
            <Link
              href={helpHref}
              className="hidden rounded-xl border border-[#2A3A32] bg-transparent px-3.5 py-2.5 text-sm font-bold text-[#E8E4D8] hover:bg-[#0B1210] sm:inline-flex"
            >
              Ayuda
            </Link>
          ) : null}
        </>
      }
    >
      {children}
    </DashboardAppShell>
  )
}
