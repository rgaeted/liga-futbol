import Link from 'next/link'

type Props = {
  refereeName: string
  backHref: string
  matchesHref: string
}

export function RefereeAdminViewBanner({ refereeName, backHref, matchesHref }: Props) {
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-amber-100">
          <span className="font-semibold uppercase tracking-[0.08em] text-amber-300/90">
            Vista admin
          </span>{' '}
          — Panel de {refereeName}
        </p>
        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[0.12em]">
          <Link href={matchesHref} className="text-amber-200 hover:underline">
            Historial
          </Link>
          <Link href={backHref} className="text-amber-200/80 hover:underline">
            ← Árbitros
          </Link>
        </div>
      </div>
    </div>
  )
}
