'use client'

import Link from 'next/link'
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell'
import {
  flatNavToGroup,
  type DashboardNavGroup,
} from '@/components/dashboard/dashboard-ui'

type NavItem = { href: string; label: string; icon?: string }

type Props = {
  nav: NavItem[]
  navGroupLabel: string
  userName: string
  roleLabel: string
  helpHref?: string
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

export function DashboardShell({
  nav,
  navGroupLabel,
  userName,
  roleLabel,
  helpHref,
  signOutAction,
  children,
}: Props) {
  const navGroups: DashboardNavGroup[] = [flatNavToGroup(navGroupLabel, nav)]

  return (
    <DashboardAppShell
      brandMark="LL"
      brandTitle="LIGALAB"
      brandSubtitle="GESTIÓN DEPORTIVA"
      userName={userName}
      roleLabel={roleLabel}
      navGroups={navGroups}
      signOutAction={signOutAction}
      markClassName="bg-org-primary"
      topActions={
        helpHref ? (
          <Link
            href={helpHref}
            className="hidden rounded-xl border border-[#dddde2] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5f5f66] hover:bg-[#f7f7f9] sm:inline-flex"
          >
            Ayuda
          </Link>
        ) : null
      }
    >
      {children}
    </DashboardAppShell>
  )
}
