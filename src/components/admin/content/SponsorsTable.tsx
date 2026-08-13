'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'

type SponsorRow = {
  id: string
  name: string
  placement: string
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}

export function SponsorsTable({
  seasonId,
  sponsors,
}: {
  seasonId: string
  sponsors: SponsorRow[]
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-kelme-border">
      <table className="min-w-full text-sm">
        <thead className="bg-kelme-gray-100">
          <tr>
            <th className="p-3 text-left">Nombre</th>
            <th className="p-3 text-left">Ubicación</th>
            <th className="p-3 text-left">Activo</th>
            <th className="p-3 text-left">Vigencia</th>
          </tr>
        </thead>
        <tbody>
          {sponsors.map((sponsor) => (
            <tr key={sponsor.id} className="border-t border-kelme-border">
              <td className="p-3">
                <Link
                  href={`/admin/content/sponsors?season=${seasonId}&edit=${sponsor.id}`}
                  className="text-kelme-red hover:underline"
                >
                  {sponsor.name}
                </Link>
              </td>
              <td className="p-3">{sponsor.placement}</td>
              <td className="p-3">{sponsor.isActive ? 'Sí' : 'No'}</td>
              <td className="p-3">
                {sponsor.startsAt
                  ? new Date(sponsor.startsAt).toLocaleDateString('es-CL')
                  : '—'}{' '}
                –{' '}
                {sponsor.endsAt ? new Date(sponsor.endsAt).toLocaleDateString('es-CL') : 'Abierta'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SponsorForm({
  seasonId,
  sponsorId,
  initial,
}: {
  seasonId: string
  sponsorId?: string
  initial?: {
    name: string
    websiteUrl: string
    placement: 'HOME' | 'SPONSORS_PAGE' | 'FOOTER'
    startsAt: string
    endsAt: string
    isActive: boolean
  }
}) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? '')
  const [placement, setPlacement] = useState(initial?.placement ?? 'HOME')
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? '')
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError('')
    const payload = {
      name,
      websiteUrl: websiteUrl || null,
      placement,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      isActive,
    }
    const result = sponsorId
      ? await submitJson(`/api/admin/seasons/${seasonId}/sponsors/${sponsorId}`, 'PUT', payload)
      : await submitJson(`/api/admin/seasons/${seasonId}/sponsors`, 'POST', payload)
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.push(`/admin/content/sponsors?season=${seasonId}`)
    router.refresh()
  }

  return (
    <section className="space-y-4 rounded-lg border border-kelme-border p-4">
      <h2 className="font-display text-lg font-semibold">
        {sponsorId ? 'Editar patrocinador' : 'Nuevo patrocinador'}
      </h2>
      <label className="block space-y-1 text-sm">
        <span>Nombre</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Sitio web</span>
        <input
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Ubicación</span>
        <select
          value={placement}
          onChange={(event) =>
            setPlacement(event.target.value as 'HOME' | 'SPONSORS_PAGE' | 'FOOTER')
          }
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        >
          <option value="HOME">Home</option>
          <option value="SPONSORS_PAGE">Página de patrocinadores</option>
          <option value="FOOTER">Footer</option>
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>Inicio</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Término</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Activo
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-xl bg-kelme-red px-4 py-2 text-sm font-semibold text-white"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </section>
  )
}
