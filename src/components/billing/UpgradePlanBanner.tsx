import Link from 'next/link'
import { BILLING_PLAN_LABELS, type BillingPlan } from '@/lib/billing/plans'

type Props = {
  plan: BillingPlan
  isOrgAdmin: boolean
}

export function UpgradePlanBanner({ plan, isOrgAdmin }: Props) {
  if (plan === 'LEAGUE') return null

  const title =
    plan === 'FREE'
      ? isOrgAdmin
        ? 'Activa Club o Liga para organizar'
        : '¿Quieres organizar equipos o ligas?'
      : 'Pasa a Liga para temporadas y fixture oficial'

  const description =
    plan === 'FREE'
      ? isOrgAdmin
        ? `Tu organización está en plan ${BILLING_PLAN_LABELS.FREE}. Actualiza para crear equipos, amistosos o temporadas.`
        : 'Puedes seguir jugando gratis y, cuando quieras organizar, revisa los planes Club y Liga.'
      : `Estás en plan ${BILLING_PLAN_LABELS.CLUB}. Liga desbloquea temporadas, partidos oficiales y contenido de liga.`

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[14px] border border-org-primary/30 bg-[#121A18] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-extrabold text-[#E8E4D8]">{title}</p>
        <p className="mt-1 text-sm text-[#8A938C]">{description}</p>
      </div>
      <Link
        href="/pricing#solicitar"
        className="btn-kelme shrink-0 text-center text-sm sm:px-5"
      >
        Ver planes
      </Link>
    </div>
  )
}
