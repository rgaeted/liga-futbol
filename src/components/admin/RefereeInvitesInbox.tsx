'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'

export type RefereeInviteRow = {
  id: string
  status: string
  refereeName: string
  fromOrganization: { name: string }
  toOrganization: { name: string }
  direction: 'received' | 'sent'
}

type Props = {
  received: RefereeInviteRow[]
  sent: RefereeInviteRow[]
}

export function RefereeInvitesInbox({ received, sent }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function runAction(id: string, action: 'accept' | 'decline' | 'cancel') {
    setError('')
    setLoadingId(id)
    const result = await submitJson(`/api/admin/referee-invites/${id}/${action}`, 'POST')
    setLoadingId(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  const pendingReceived = received.filter((item) => item.status === 'PENDING')
  const pendingSent = sent.filter((item) => item.status === 'PENDING')

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-[#2A3A32] bg-[#0B1210] px-4 py-3 text-sm text-org-primary">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Recibidas</h2>
        {pendingReceived.length === 0 ? (
          <p className="rounded-xl border border-kelme-border bg-kelme-surface p-4 text-sm text-kelme-gray-500">
            No tienes invitaciones pendientes.
          </p>
        ) : (
          pendingReceived.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4"
            >
              <p className="font-ui text-sm">
                <span className="font-medium">{item.fromOrganization.name}</span> te comparte a{' '}
                <span className="font-medium">{item.refereeName}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loadingId === item.id}
                  onClick={() => runAction(item.id, 'accept')}
                  className="rounded-lg bg-kelme-red px-3 py-1.5 text-sm font-semibold text-white hover:bg-kelme-red-dark disabled:opacity-50"
                >
                  Aceptar árbitro
                </button>
                <button
                  type="button"
                  disabled={loadingId === item.id}
                  onClick={() => runAction(item.id, 'decline')}
                  className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm hover:bg-kelme-gray-100 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Enviadas</h2>
        {pendingSent.length === 0 ? (
          <p className="rounded-xl border border-kelme-border bg-kelme-surface p-4 text-sm text-kelme-gray-500">
            No tienes invitaciones enviadas pendientes.
          </p>
        ) : (
          pendingSent.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4"
            >
              <p className="font-ui text-sm">
                Compartiste a <span className="font-medium">{item.refereeName}</span> con{' '}
                <span className="font-medium">{item.toOrganization.name}</span>
              </p>
              <button
                type="button"
                disabled={loadingId === item.id}
                onClick={() => runAction(item.id, 'cancel')}
                className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm hover:bg-kelme-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
