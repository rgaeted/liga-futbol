import type { ReactNode } from 'react'

export const platformInputClass =
  'w-full rounded-xl border border-[#dddde2] bg-white px-3.5 py-3 text-sm font-semibold text-[#34343a] outline-none placeholder:font-normal placeholder:text-[#8d8d96] focus:border-[#c91f26] focus:ring-2 focus:ring-[#c91f2620]'

export const platformBtnPrimaryClass =
  'rounded-xl bg-[#c91f26] px-4 py-3 text-sm font-extrabold text-white shadow-[0_6px_14px_#c91f2630] transition hover:bg-[#b01b22] disabled:cursor-not-allowed disabled:opacity-50'

export const platformBtnGhostClass =
  'rounded-xl border border-[#dddde2] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5f5f66] transition hover:bg-[#f7f7f9]'

export function PlatformPanel({
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

export function PlatformPanelInner({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

export function PlatformPageHeader({
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
