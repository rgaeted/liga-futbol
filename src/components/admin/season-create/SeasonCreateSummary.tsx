'use client'

type SummaryRow = { label: string; value: string }

type EnrollmentSummary = {
  teamCount: number
  playerCount: number
}

type MobileSummary = {
  slug: string
  displayName: string
}

type Props = {
  rows: SummaryRow[]
  enrollment?: EnrollmentSummary
  mobile?: MobileSummary
  footerMessage?: string
}

function dash(value: string | undefined | null): string {
  return value?.trim() ? value : '—'
}

export function SeasonCreateSummary({ rows, enrollment, mobile, footerMessage }: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-kelme-border bg-kelme-gray-50 p-5">
      <div>
        <h2 className="font-ui text-xs font-semibold uppercase tracking-wider text-kelme-gray-400">
          Resumen de la temporada
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">{row.label}</dt>
              <dd className="text-right font-medium text-kelme-gray-900">{dash(row.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {enrollment ? (
        <div className="border-t border-kelme-border pt-4">
          <h3 className="font-ui text-xs font-semibold uppercase tracking-wider text-kelme-gray-400">
            Inscripción
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">Equipos</dt>
              <dd className="font-medium text-kelme-gray-900">{enrollment.teamCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">Jugadores inscritos</dt>
              <dd className="font-medium text-kelme-gray-900">{enrollment.playerCount}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {mobile ? (
        <div className="border-t border-kelme-border pt-4">
          <h3 className="font-ui text-xs font-semibold uppercase tracking-wider text-kelme-gray-400">
            App móvil
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">Slug</dt>
              <dd className="font-medium text-kelme-gray-900">{dash(mobile.slug)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">Nombre visible</dt>
              <dd className="text-right font-medium text-kelme-gray-900">{dash(mobile.displayName)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {footerMessage ? (
        <p className="border-t border-kelme-border pt-4 text-xs text-kelme-gray-500">
          {footerMessage}
        </p>
      ) : null}
    </div>
  )
}
