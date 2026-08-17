'use client'

import Link from 'next/link'
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell'
import type { DashboardNavGroup } from '@/components/dashboard/dashboard-ui'

const NAV_GROUPS: DashboardNavGroup[] = [
  {
    label: 'General',
    items: [{ href: '/plataforma', label: 'Empresas', icon: 'EM' }],
  },
  {
    label: 'Plataforma',
    items: [
      { href: '/plataforma/usuarios', label: 'Usuarios', icon: 'US' },
      { href: '/plataforma/arbitros', label: 'Árbitros', icon: 'AR' },
      { href: '/plataforma/apps', label: 'Apps móviles', icon: 'AP' },
    ],
  },
]

type Props = {
  userName: string
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

export function PlatformShell({ userName, signOutAction, children }: Props) {
  return (
    <DashboardAppShell
      brandMark="LL"
      brandTitle="LIGALAB"
      brandSubtitle="CONSOLA DE PLATAFORMA"
      userName={userName}
      roleLabel="Super admin"
      navGroups={NAV_GROUPS}
      signOutAction={signOutAction}
      topActions={
        <Link
          href="/organizaciones"
          className="hidden rounded-xl border border-[#dddde2] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5f5f66] hover:bg-[#f7f7f9] sm:inline-flex"
        >
          Mis ligas
        </Link>
      }
    >
      {children}
    </DashboardAppShell>
  )
}
