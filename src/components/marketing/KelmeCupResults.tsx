import Link from 'next/link'

type Result = {
  id: string
  dateLine: string
  home: string
  away: string
  homeScore: number
  awayScore: number
}

export function KelmeCupResults({ results, slug }: { results: Result[]; slug: string }) {
  return (
    <section id="resultados" className="scroll-mt-24 bg-[#f4f9ff] py-8 text-[#123a6b]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <p className="font-script text-2xl text-[#1A7AE8]">Resultados</p>
        <h2 className="mt-1 font-display text-[28px] font-bold uppercase tracking-[-0.03em] text-[#0B3D8F]">
          Últimos partidos
        </h2>
        <div className="mt-5 grid grid-cols-5 gap-3 max-md:grid-cols-2 max-[420px]:grid-cols-1">
          {results.map((match) => (
            <Link
              key={match.id}
              href={`/${slug}/live/${match.id}`}
              className="rounded-2xl border border-[#1A7AE8]/20 bg-white p-4 shadow-[0_8px_20px_rgba(26,122,232,0.06)] transition hover:-translate-y-0.5 hover:border-[#1A7AE8]/50"
            >
              <p className="mb-3 text-[11px] font-semibold text-[#4d6790]">{match.dateLine}</p>
              <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                <span>{match.home}</span>
                <strong className="font-display text-lg text-[#0B3D8F]">{match.homeScore}</strong>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[13px] font-semibold">
                <span>{match.away}</span>
                <strong className="font-display text-lg text-[#0B3D8F]">{match.awayScore}</strong>
              </div>
              <p className="mt-3 border-t border-[#1A7AE8]/15 pt-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#1A7AE8]">
                Finalizado
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
