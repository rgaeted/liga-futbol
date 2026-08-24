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
    <div className="rounded-[14px] border border-[#2A3A32] bg-kelme-surface p-8 text-center">
      <h1 className="font-display text-2xl font-bold text-[#E8E4D8]">No pudimos cargar el panel</h1>
      <p className="mt-2 text-sm text-[#8A938C]">
        Hubo un problema al cargar los datos. Intenta de nuevo en unos segundos.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn-kelme rounded-[10px] px-4 py-2 font-ui text-sm font-semibold"
        >
          Reintentar
        </button>
        <Link
          href={orgPath('/admin/matches')}
          className="btn-kelme-outline rounded-[10px] px-4 py-2 font-ui text-sm font-semibold"
        >
          Ir a partidos
        </Link>
      </div>
    </div>
  )
}
