import type { ReactNode } from 'react'

export const dashInputClass =
  'w-full rounded-xl border border-[#dddde2] bg-white px-3.5 py-3 text-sm font-semibold text-[#34343a] outline-none placeholder:font-normal placeholder:text-[#8d8d96] focus:border-[#c91f26] focus:ring-2 focus:ring-[#c91f2620]'

export const dashBtnPrimaryClass =
  'rounded-xl bg-[#c91f26] px-4 py-3 text-sm font-extrabold text-white shadow-[0_6px_14px_#c91f2630] transition hover:bg-[#b01b22] disabled:cursor-not-allowed disabled:opacity-50'

export const dashBtnGhostClass =
  'rounded-xl border border-[#dddde2] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5f5f66] transition hover:bg-[#f7f7f9]'

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
    <article
      className={`overflow-hidden rounded-[18px] border border-[#e5e5e9] bg-white ${className}`}
    >
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
        <div className="text-[11px] font-black uppercase tracking-[0.13em] text-[#999]">
          {eyebrow}
          {status ? (
            <span className="ml-2 inline-block rounded-full bg-[#eafaf4] px-2.5 py-1 text-[11px] font-bold normal-case tracking-normal text-[#087d55]">
              {status}
            </span>
          ) : null}
        </div>
        <h1 className="mt-1.5 text-[clamp(2rem,4vw,3rem)] font-black leading-none tracking-[-0.04em] text-[#17171a]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-[#777]">{subtitle}</p> : null}
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
