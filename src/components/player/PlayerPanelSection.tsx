import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  action?: ReactNode
  compact?: boolean
}

export function PlayerPanelSection({ title, children, action, compact = false }: Props) {
  return (
    <section className={`rounded-2xl border border-[#2A3A32] bg-[#121A18] ${compact ? 'p-4' : 'p-5'}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <h2 className="font-[family-name:var(--font-anton)] text-base uppercase tracking-[0.08em] text-[#E8E4D8]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
