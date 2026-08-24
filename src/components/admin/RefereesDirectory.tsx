'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'
import { useOrgPath } from '@/hooks/useOrgPath'
import { APP_LOCALE } from '@/lib/locale'

export type RefereeDirectoryItem = {
  userId: string
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  whatsappUrl: string | null
  notes: string | null
  photoUrl: string | null
  nextMatch: { id: string; scheduledAt: string; venue: string | null } | null
}

export type RefereeInviteItem = {
  id: string
  status: string
  refereeName: string
  fromOrganization: { name: string; slug: string }
  toOrganization: { name: string; slug: string }
  direction: 'received' | 'sent'
}

type OrganizationOption = {
  id: string
  slug: string
  name: string
  logoUrl: string | null
}

type Props = {
  referees: RefereeDirectoryItem[]
  pendingReceived: RefereeInviteItem[]
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

export function RefereesDirectory({ referees, pendingReceived }: Props) {
  const orgPath = useOrgPath()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shareUserId, setShareUserId] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [selectedSlug, setSelectedSlug] = useState('')

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const result = await submitJson('/api/admin/referees', 'POST', {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password') || undefined,
      phone: form.get('phone') || null,
      whatsapp: form.get('whatsapp') || null,
      notes: form.get('notes') || null,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    e.currentTarget.reset()
    router.refresh()
  }

  async function openShare(userId: string) {
    setShareUserId(userId)
    setSelectedSlug('')
    setError('')
    const res = await fetch('/api/admin/organizations-directory')
    if (!res.ok) {
      setError('No se pudo cargar el directorio de organizaciones')
      return
    }
    setOrganizations(await res.json())
  }

  async function submitShare() {
    if (!shareUserId || !selectedSlug) return
    setLoading(true)
    setError('')
    const result = await submitJson(`/api/admin/referees/${shareUserId}/share`, 'POST', {
      toOrganizationSlug: selectedSlug,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setShareUserId(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {pendingReceived.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="font-ui text-sm font-medium text-amber-900">
            Tienes invitaciones de árbitros pendientes
          </p>
          {pendingReceived.map((invite) => (
            <p key={invite.id} className="font-ui text-sm text-amber-800">
              {invite.fromOrganization.name} te comparte a {invite.refereeName}.{' '}
              <Link href={orgPath('/admin/referees/invites')} className="underline">
                Ver invitaciones
              </Link>
            </p>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-[#2A3A32] bg-[#0B1210] px-4 py-3 text-sm text-org-primary">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3"
      >
        <input
          name="name"
          placeholder="Nombre"
          required
          className="input-kelme rounded-lg px-3 py-2"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="input-kelme rounded-lg px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña (usuarios nuevos)"
          className="input-kelme rounded-lg px-3 py-2"
        />
        <input
          name="phone"
          placeholder="Teléfono"
          className="input-kelme rounded-lg px-3 py-2"
        />
        <input
          name="whatsapp"
          placeholder="WhatsApp"
          className="input-kelme rounded-lg px-3 py-2"
        />
        <input
          name="notes"
          placeholder="Notas internas"
          className="input-kelme rounded-lg px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-kelme rounded-lg px-4 py-2 font-semibold disabled:opacity-50 md:col-span-3"
        >
          {loading ? 'Guardando...' : 'Agregar árbitro'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Directorio</h2>
        <Link
          href={orgPath('/admin/referees/invites')}
          className="font-ui text-sm text-kelme-red hover:underline"
        >
          Invitaciones
        </Link>
      </div>

      {referees.length === 0 ? (
        <p className="rounded-xl border border-kelme-border bg-kelme-surface p-6 text-sm text-kelme-gray-500">
          Aún no tienes árbitros registrados.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {referees.map((referee) => (
            <article
              key={referee.userId}
              className="rounded-xl border border-kelme-border bg-kelme-surface p-4"
            >
              <div className="flex items-start gap-3">
                {referee.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={referee.photoUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kelme-gray-100 text-lg font-bold text-kelme-gray-500">
                    {referee.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold text-kelme-gray-900">
                    {referee.name}
                  </h3>
                  <p className="font-ui text-sm text-kelme-gray-500">{referee.email}</p>
                  {referee.phone ? (
                    <p className="mt-1 font-ui text-sm">{referee.phone}</p>
                  ) : null}
                  {referee.whatsappUrl ? (
                    <a
                      href={referee.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block rounded-lg bg-[#3D8B6E] px-3 py-1 text-sm font-medium text-[#E8E4D8] hover:brightness-110"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 font-ui text-sm text-kelme-gray-600">
                Próximo partido:{' '}
                {referee.nextMatch
                  ? `${formatDate(referee.nextMatch.scheduledAt)}${referee.nextMatch.venue ? ` · ${referee.nextMatch.venue}` : ''}`
                  : 'Sin partidos programados'}
              </p>
              <button
                type="button"
                onClick={() => openShare(referee.userId)}
                className="mt-3 font-ui text-sm text-kelme-red hover:underline"
              >
                Invitar a otra liga
              </button>
            </article>
          ))}
        </div>
      )}

      {shareUserId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-kelme-surface p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold">Invitar a otra organización</h3>
            <p className="mt-1 font-ui text-sm text-kelme-gray-500">
              Elige la liga que recibirá la invitación para compartir este árbitro.
            </p>
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="mt-4 w-full rounded-lg border border-kelme-border px-3 py-2"
            >
              <option value="">Selecciona una organización</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.slug}>
                  {org.name}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShareUserId(null)}
                className="rounded-lg px-4 py-2 text-sm text-kelme-gray-600 hover:bg-kelme-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedSlug || loading}
                onClick={submitShare}
                className="rounded-lg bg-kelme-red px-4 py-2 text-sm font-semibold text-white hover:bg-kelme-red-dark disabled:opacity-50"
              >
                Enviar invitación
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
