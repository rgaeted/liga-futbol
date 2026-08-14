'use client'

import Link from 'next/link'
import { useOrgPath } from '@/hooks/useOrgPath'

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const orgPath = useOrgPath()

  return (
    <div className="rounded-[14px] border border-red-200 bg-white p-8 text-center">
      <h1 className="font-display text-2xl font-bold text-zinc-900">No pudimos cargar el panel</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Hubo un problema al cargar los datos. Intenta de nuevo en unos segundos.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[10px] bg-[#b91c1c] px-4 py-2 font-ui text-sm font-semibold text-white hover:bg-[#9f1728]"
        >
          Reintentar
        </button>
        <Link
          href={orgPath('/admin/matches')}
          className="rounded-[10px] border border-zinc-200 px-4 py-2 font-ui text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
        >
          Ir a partidos
        </Link>
      </div>
    </div>
  )
}
