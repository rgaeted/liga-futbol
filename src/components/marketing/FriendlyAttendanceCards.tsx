import Link from 'next/link'
import { attendanceCountLabel, friendlyMatchPublicPath } from '@/lib/match-attendance'

export type AttendanceCard = {
  matchId: string
  matchLabel: string
  dateLine: string
  attendees: Array<{ playerId: string }>
}

export function FriendlyAttendanceCards({
  slug,
  boards,
  light = false,
}: {
  slug: string
  boards: AttendanceCard[]
  light?: boolean
}) {
  if (boards.length === 0) return null
  return (
    <section id="asistencia" className="scroll-mt-24 py-[26px]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-org-primary">
          Lista del grupo
        </p>
        <h2
          className={`mt-1 font-display text-[28px] font-semibold uppercase tracking-[-0.035em] ${
            light ? 'text-[#0B3D8F]' : ''
          }`}
        >
          ¿Quién va?
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boards.map((board) => (
            <Link
              key={board.matchId}
              href={friendlyMatchPublicPath(slug, board.matchId)}
              className={
                light
                  ? 'rounded-[18px] border border-[#1A7AE8]/20 bg-white p-5 transition hover:border-[#1A7AE8]/50'
                  : 'rounded-[18px] border border-[#2a302d] bg-[#131615] p-5 transition hover:border-[#414943]'
              }
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-org-primary">
                {board.dateLine}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold uppercase">
                {board.matchLabel}
              </h3>
              <p className={`mt-2 text-sm ${light ? 'text-[#4d6790]' : 'text-[#9ca59f]'}`}>
                {attendanceCountLabel(board.attendees.length)}
              </p>
              <p className="mt-4 text-sm font-bold text-org-primary">Ver quién va →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
