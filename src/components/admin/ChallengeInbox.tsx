'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChallengeStatus } from '@prisma/client'
import { submitJson } from '@/components/admin/submit'
import { useOrgPath } from '@/hooks/useOrgPath'
import { APP_LOCALE } from '@/lib/locale'

export type ChallengeInboxItem = {
  id: string
  challengeStatus: ChallengeStatus
  sideAName: string | null
  sideBName: string | null
  scheduledAt: string
  organization: { id: string; slug: string; name: string }
  guestOrganization: { id: string; slug: string; name: string } | null
}

type Props = {
  organizationId: string
  items: ChallengeInboxItem[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

export function ChallengeInbox({ organizationId, items }: Props) {
  const orgPath = useOrgPath()
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function runAction(matchId: string, action: 'accept' | 'decline' | 'cancel') {
    setError('')
    setLoadingId(matchId)
    const result = await submitJson(`/api/matches/${matchId}/challenge/${action}`, 'POST')
    setLoadingId(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-kelme-border bg-kelme-surface p-6 text-sm text-kelme-gray-500">
        No tienes desafíos pendientes ni activos.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {items.map((item) => {
        const isHost = item.organization.id === organizationId
        const isGuest = item.guestOrganization?.id === organizationId
        const opponentName = isHost
          ? item.guestOrganization?.name ?? item.sideBName ?? 'Visitante'
          : item.organization.name
        const title =
          item.sideAName && item.sideBName
            ? `${item.sideAName} vs ${item.sideBName}`
            : `${item.organization.name} vs ${item.guestOrganization?.name ?? '—'}`

        return (
          <article
            key={item.id}
            className="rounded-xl border border-kelme-border bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold text-kelme-gray-900">{title}</p>
                <p className="mt-1 text-sm text-kelme-gray-500">{formatDate(item.scheduledAt)}</p>
                <p className="mt-2 text-sm text-kelme-gray-700">
                  {isHost ? (
                    item.challengeStatus === ChallengeStatus.PENDING ? (
                      <>Esperando a {opponentName}</>
                    ) : (
                      <>Desafío aceptado por {opponentName}</>
                    )
                  ) : (
                    <>
                      {item.organization.name} te desafió
                      {item.challengeStatus === ChallengeStatus.PENDING
                        ? ' — esperando tu respuesta'
                        : ' — aceptaste el desafío'}
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {isGuest && item.challengeStatus === ChallengeStatus.PENDING ? (
                  <>
                    <button
                      type="button"
                      disabled={loadingId === item.id}
                      onClick={() => void runAction(item.id, 'accept')}
                      className="rounded-lg bg-kelme-red px-4 py-2 text-sm font-semibold text-white hover:bg-kelme-red-dark disabled:opacity-50"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      disabled={loadingId === item.id}
                      onClick={() => void runAction(item.id, 'decline')}
                      className="rounded-lg border border-kelme-border px-4 py-2 text-sm font-semibold hover:bg-kelme-gray-50 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </>
                ) : null}

                {isHost && item.challengeStatus === ChallengeStatus.PENDING ? (
                  <button
                    type="button"
                    disabled={loadingId === item.id}
                    onClick={() => void runAction(item.id, 'cancel')}
                    className="rounded-lg border border-kelme-border px-4 py-2 text-sm font-semibold hover:bg-kelme-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                ) : null}

                {isGuest && item.challengeStatus === ChallengeStatus.ACCEPTED ? (
                  <Link
                    href={orgPath(`/admin/challenges/${item.id}`)}
                    className="rounded-lg bg-kelme-red px-4 py-2 text-sm font-semibold text-white hover:bg-kelme-red-dark"
                  >
                    Armar tu lado
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
