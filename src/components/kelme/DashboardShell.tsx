'use client'

import Link from 'next/link'
import { UpgradePlanBanner } from '@/components/billing/UpgradePlanBanner'
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell'
import {
  flatNavToGroup,
  type DashboardNavGroup,
} from '@/components/dashboard/dashboard-ui'
import { OrganizationSwitcher } from '@/components/tenant/OrganizationSwitcher'
import type { BillingPlan } from '@/lib/billing/plans'

type NavItem = { href: string; label: string; icon?: string }

type Props = {
  nav?: NavItem[]
  navGroups?: DashboardNavGroup[]
  navGroupLabel?: string
  organizationName: string
  organizationSlug?: string
  userName: string
  userPhotoUrl?: string | null
  roleLabel: string
  helpHref?: string
  showPlatformLink?: boolean
  organizationPlan?: BillingPlan
  isOrgAdmin?: boolean
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

export function DashboardShell({
  nav,
  navGroups,
  navGroupLabel,
  organizationName,
  organizationSlug,
  userName,
  userPhotoUrl,
  roleLabel,
  helpHref,
  showPlatformLink = false,
  organizationPlan,
  isOrgAdmin = false,
  signOutAction,
  children,
}: Props) {
  const resolvedNavGroups: DashboardNavGroup[] =
    navGroups ?? (nav ? [flatNavToGroup(navGroupLabel ?? 'Menú', nav)] : [])

  return (
    <DashboardAppShell
      brandMark={organizationName.slice(0, 1).toUpperCase()}
      brandTitle={organizationName}
      brandSubtitle={`LigaLab · ${roleLabel}`}
      userName={userName}
      userPhotoUrl={userPhotoUrl}
      roleLabel={roleLabel}
      navGroups={resolvedNavGroups}
      signOutAction={signOutAction}
      markClassName="bg-org-primary"
      topActions={
        <>
          <OrganizationSwitcher />
          {showPlatformLink && organizationSlug ? (
            <Link
              href="/plataforma"
              className="hidden rounded-xl border border-[#2A3A32] bg-transparent px-3.5 py-2.5 text-sm font-bold text-[#E8E4D8] hover:bg-[#0B1210] sm:inline-flex"
            >
              Plataforma
            </Link>
          ) : null}
          {organizationPlan && organizationPlan !== 'LEAGUE' ? (
            <Link
              href="/pricing"
              className="hidden rounded-xl border border-[#2A3A32] bg-transparent px-3.5 py-2.5 text-sm font-bold text-[#E8E4D8] hover:bg-[#0B1210] sm:inline-flex"
            >
              Actualizar plan
            </Link>
          ) : null}
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
      {organizationPlan ? (
        <UpgradePlanBanner plan={organizationPlan} isOrgAdmin={isOrgAdmin} />
      ) : null}
      {children}
    </DashboardAppShell>
  )
}
