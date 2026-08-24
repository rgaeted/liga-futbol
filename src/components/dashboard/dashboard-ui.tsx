import type { ReactNode } from 'react'

export const dashInputClass = 'input-kelme'

export const dashBtnPrimaryClass = 'btn-kelme'

export const dashBtnGhostClass =
  'rounded-xl border border-[#2A3A32] bg-transparent px-3.5 py-2.5 text-sm font-bold text-[#E8E4D8] transition hover:bg-[#0B1210] disabled:cursor-not-allowed disabled:opacity-50'

export const dashSelectClass =
  'input-kelme h-[38px] min-w-0 max-w-full flex-1 truncate rounded-xl px-2.5 font-ui text-[13px] font-semibold'

/** @deprecated use dashInputClass */
export const platformInputClass = dashInputClass
/** @deprecated use dashBtnPrimaryClass */
export const platformBtnPrimaryClass = dashBtnPrimaryClass
/** @deprecated use dashBtnGhostClass */
export const platformBtnGhostClass = dashBtnGhostClass

export function DashPanel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <article className={`card-kelme overflow-hidden ${className}`}>
      {children}
    </article>
  )
}

export function DashPanelInner({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

/** @deprecated use DashPanel */
export const PlatformPanel = DashPanel
/** @deprecated use DashPanelInner */
export const PlatformPanelInner = DashPanelInner

export function DashPageHeader({
  eyebrow,
  title,
  subtitle,
  status,
  actions,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  status?: string
  actions?: ReactNode
}) {
  return (
    <section className="mb-6 flex flex-col items-start justify-between gap-6 lg:mb-7 lg:flex-row lg:items-end">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
          {eyebrow}
          {status ? (
            <span className="ml-2 inline-block rounded-full bg-[#0B1210] px-2.5 py-1 text-[11px] font-bold normal-case tracking-normal text-[#3D8B6E]">
              {status}
            </span>
          ) : null}
        </div>
        <h1 className="font-display mt-1.5 text-[clamp(2rem,4vw,3rem)] font-semibold uppercase leading-none tracking-wide text-[#E8E4D8]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-[#8A938C]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </section>
  )
}

/** @deprecated use DashPageHeader */
export const PlatformPageHeader = DashPageHeader

export type DashboardNavItem = {
  href: string
  label: string
  icon: string
  count?: number
  activePrefixes?: string[]
}

export type DashboardNavGroup = {
  label: string
  items: DashboardNavItem[]
}

export function isDashboardNavActive(pathname: string, item: DashboardNavItem) {
  const candidates = item.activePrefixes?.length ? item.activePrefixes : [item.href]
  return candidates.some((href) => {
    if (pathname === href) return true
    if (href.endsWith('/admin') && pathname === href) return true
    return pathname.startsWith(`${href}/`)
  })
}

export function flatNavToGroup(
  groupLabel: string,
  items: Array<{ href: string; label: string; icon?: string }>,
): DashboardNavGroup {
  return {
    label: groupLabel,
    items: items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon ?? item.label.slice(0, 2).toUpperCase(),
    })),
  }
}
