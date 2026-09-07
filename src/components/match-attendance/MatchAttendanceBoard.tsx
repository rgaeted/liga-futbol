'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { submitJson } from '@/components/admin/submit'
import { isViewerGoing, type MatchAttendanceEntry } from '@/lib/match-attendance'

export type AttendanceViewer = {
  signedIn: boolean
  canSign: boolean
  myPlayerId: string | null
  loginHref: string
}

type Props = {
  matchId: string
  open: boolean
  attendees: MatchAttendanceEntry[]
  viewer: AttendanceViewer
  matchLabel?: string
  dateLine?: string
  sectionId?: string
}

export function MatchAttendanceBoard({
  matchId,
  open,
  attendees,
  viewer,
  matchLabel,
  dateLine,
  sectionId = 'asistencia',
}: Props) {
  const router = useRouter()
  const [rows, setRows] = useState(attendees)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const going = isViewerGoing(viewer.myPlayerId, rows)
  const countLabel = rows.length === 1 ? '1 anotado' : `${rows.length} anotados`

  async function toggle() {
    setPending(true)
    setError('')
    const result = await submitJson(
      `/api/matches/${matchId}/attendance`,
      going ? 'DELETE' : 'POST',
      going ? undefined : {}
    )
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
    const res = await fetch(`/api/matches/${matchId}/attendance`)
    if (res.ok) {
      const data = (await res.json()) as { attendees: MatchAttendanceEntry[] }
      setRows(data.attendees)
    }
  }

  return (
    <section id={sectionId} className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-org-primary">
            {dateLine ?? 'Lista del grupo'}
          </p>
          <h2 className="mt-1 font-display text-[28px] font-semibold uppercase tracking-[-0.035em]">
            ¿Quién va?
          </h2>
          {matchLabel ? (
            <p className="mt-1 text-sm text-[#9ca59f]">{matchLabel}</p>
          ) : null}
        </div>
        <p className="text-sm text-[#9ca59f]">{countLabel}</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-[#2a302d] bg-[#131615] px-4 py-5 text-sm text-[#9ca59f]">
          Todavía nadie anotó su nombre.
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.playerId}
              className="flex items-center gap-3 rounded-xl border border-[#2a302d] bg-[#131615] px-3 py-2.5"
            >
              <span className="w-7 font-data text-xs text-[#8A938C]">{index + 1}</span>
              {row.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.photoUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0e110f] text-[10px] font-bold uppercase text-[#E8E4D8]">
                  {row.name.slice(0, 2)}
                </span>
              )}
              <span className="min-w-0 truncate font-semibold">{row.name}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4">
        {!open ? (
          <p className="text-sm text-[#9ca59f]">
            El listado se cierra cuando empieza el partido.
          </p>
        ) : !viewer.signedIn ? (
          <Link href={viewer.loginHref} className="btn-kelme inline-flex">
            Ingresa para anotar tu nombre
          </Link>
        ) : !viewer.canSign ? (
          <p className="text-sm text-[#9ca59f]">
            No tienes ficha de jugador en esta liga. Pide al administrador que enlace tu cuenta.
          </p>
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="btn-kelme disabled:opacity-50"
          >
            {pending ? 'Guardando…' : going ? 'Ya no voy' : 'Voy'}
          </button>
        )}
        {error ? <p className="mt-2 text-sm text-kelme-red">{error}</p> : null}
      </div>
    </section>
  )
}
