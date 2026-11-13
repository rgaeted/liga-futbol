'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SponsorLogoUpload } from '@/components/admin/content/SponsorLogoUpload'
import { submitJson } from '@/components/admin/submit'
import { useOrgPath } from '@/hooks/useOrgPath'

type SponsorRow = {
  id: string
  name: string
  placement: string
  tier: 'MAIN' | 'OFFICIAL'
  showOnLanding: boolean
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  stats: { current: { views: number; clicks: number }; previous: { views: number; clicks: number } }
  /** Logo con versión (o null si no tiene). */
  logoUrl: string | null
}

export function SponsorsTable({
  seasonId,
  sponsors,
  selectedId = null,
}: {
  seasonId: string
  sponsors: SponsorRow[]
  /** Auspiciador que se está editando, para marcarlo en la lista. */
  selectedId?: string | null
}) {
  const orgPath = useOrgPath()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Patrocinadores de la temporada</h2>
        <Link
          href={orgPath(`/admin/content/sponsors?season=${seasonId}#editor`)}
          className="rounded-xl bg-org-primary px-4 py-2 text-sm font-extrabold text-[#E8E4D8] transition hover:brightness-110"
        >
          + Nuevo patrocinador
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="min-w-full text-sm">
        <thead className="bg-kelme-gray-100">
          <tr>
            <th className="p-3 text-left">Nombre</th>
            <th className="p-3 text-left">Ubicación</th>
            <th className="p-3 text-left">Nivel</th>
            <th className="p-3 text-left">En el landing</th>
            <th className="p-3 text-left">Activo</th>
            <th className="p-3 text-left">Vigencia</th>
            <th className="p-3 text-left">Vistas / clics (este mes)</th>
            <th className="p-3 text-left">Vistas / clics (mes anterior)</th>
          </tr>
        </thead>
        <tbody>
          {sponsors.map((sponsor) => (
            <tr
              key={sponsor.id}
              aria-current={sponsor.id === selectedId ? 'true' : undefined}
              className={`border-t border-kelme-border ${
                sponsor.id === selectedId ? 'bg-[color:var(--org-primary)]/10' : ''
              }`}
            >
              <td className="p-3">
                <Link
                  href={orgPath(`/admin/content/sponsors?season=${seasonId}&edit=${sponsor.id}#editor`)}
                  className="flex items-center gap-3 text-kelme-red hover:underline"
                >
                  <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-kelme-border bg-[#0B1210] text-[10px] text-[#8A938C]">
                    {sponsor.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sponsor.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                    ) : (
                      'Sin logo'
                    )}
                  </span>
                  {sponsor.name}
                </Link>
              </td>
              <td className="p-3">{sponsor.placement}</td>
              <td className="p-3">{sponsor.tier === 'MAIN' ? 'Principal' : 'Oficial'}</td>
              <td className="p-3">{sponsor.showOnLanding ? 'Sí' : 'No'}</td>
              <td className="p-3">{sponsor.isActive ? 'Sí' : 'No'}</td>
              <td className="p-3">
                {sponsor.startsAt
                  ? new Date(sponsor.startsAt).toLocaleDateString('es-CL')
                  : '—'}{' '}
                –{' '}
                {sponsor.endsAt ? new Date(sponsor.endsAt).toLocaleDateString('es-CL') : 'Abierta'}
              </td>
              <td className="p-3 tabular-nums">
                {sponsor.stats.current.views} / {sponsor.stats.current.clicks}
              </td>
              <td className="p-3 tabular-nums">
                {sponsor.stats.previous.views} / {sponsor.stats.previous.clicks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

export function SponsorForm({
  seasonId,
  sponsorId,
  initial,
  logoUrl = null,
}: {
  seasonId: string
  sponsorId?: string
  /** Logo actual (con versión) del auspiciador que se edita. */
  logoUrl?: string | null
  initial?: {
    name: string
    websiteUrl: string
    placement: 'HOME' | 'SPONSORS_PAGE' | 'FOOTER'
    startsAt: string
    endsAt: string
    isActive: boolean
    tier: 'MAIN' | 'OFFICIAL'
    showOnLanding: boolean
    tagline: string
    ctaLabel: string
    ctaUrl: string
  }
}) {
  const router = useRouter()
  const orgPath = useOrgPath()
  const [name, setName] = useState(initial?.name ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? '')
  const [placement, setPlacement] = useState(initial?.placement ?? 'HOME')
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? '')
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [tier, setTier] = useState<'MAIN' | 'OFFICIAL'>(initial?.tier ?? 'OFFICIAL')
  const [showOnLanding, setShowOnLanding] = useState(initial?.showOnLanding ?? false)
  const [tagline, setTagline] = useState(initial?.tagline ?? '')
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? '')
  const [ctaUrl, setCtaUrl] = useState(initial?.ctaUrl ?? '')
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
      tier,
      showOnLanding,
      tagline: tagline || null,
      ctaLabel: ctaLabel || null,
      ctaUrl: ctaUrl || null,
    }
    if (sponsorId) {
      const result = await submitJson(`/api/admin/seasons/${seasonId}/sponsors/${sponsorId}`, 'PUT', payload)
      setSaving(false)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.push(orgPath(`/admin/content/sponsors?season=${seasonId}`))
      router.refresh()
      return
    }

    // Recién creado: se abre su edición para que se pueda subir el logo de inmediato.
    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}/sponsors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      setSaving(false)
      if (!response.ok || !data?.sponsor?.id) {
        setError(typeof data?.error === 'string' ? data.error : `Error ${response.status}`)
        return
      }
      router.push(orgPath(`/admin/content/sponsors?season=${seasonId}&edit=${data.sponsor.id}`))
      router.refresh()
    } catch {
      setSaving(false)
      setError('No se pudo conectar con el servidor')
    }
  }

  return (
    <section id="editor" className="scroll-mt-24 space-y-4 rounded-lg border border-kelme-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          {sponsorId ? `Editando: ${initial?.name ?? ''}` : 'Nuevo patrocinador'}
        </h2>
        {sponsorId ? (
          <Link
            href={orgPath(`/admin/content/sponsors?season=${seasonId}`)}
            className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm font-semibold hover:bg-[#121A18]"
          >
            Cerrar
          </Link>
        ) : null}
      </div>
      {sponsorId ? (
        <SponsorLogoUpload seasonId={seasonId} sponsorId={sponsorId} logoUrl={logoUrl} />
      ) : (
        <p className="rounded-lg border border-dashed border-kelme-border p-3 text-sm text-[#8A938C]">
          Guarda el patrocinador para poder subir su logo.
        </p>
      )}
      <label className="block space-y-1 text-sm">
        <span>Nombre</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full input-kelme rounded-lg px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Sitio web</span>
        <input
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          className="w-full input-kelme rounded-lg px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Ubicación</span>
        <select
          value={placement}
          onChange={(event) =>
            setPlacement(event.target.value as 'HOME' | 'SPONSORS_PAGE' | 'FOOTER')
          }
          className="input-kelme rounded-lg px-3 py-2"
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
            className="w-full input-kelme rounded-lg px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Término</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full input-kelme rounded-lg px-3 py-2"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Activo
      </label>

      <div className="space-y-3 rounded-lg border border-kelme-border p-3">
        <h3 className="text-sm font-semibold">En el landing de la liga</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showOnLanding}
            onChange={(event) => setShowOnLanding(event.target.checked)}
          />
          Mostrar en el landing
        </label>
        <label className="block space-y-1 text-sm">
          <span>Nivel</span>
          <select
            value={tier}
            onChange={(event) => setTier(event.target.value as 'MAIN' | 'OFFICIAL')}
            className="input-kelme rounded-lg px-3 py-2"
          >
            <option value="OFFICIAL">Oficial</option>
            <option value="MAIN">Principal</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Frase u oferta (máx. 140 caracteres)</span>
          <input
            value={tagline}
            maxLength={140}
            onChange={(event) => setTagline(event.target.value)}
            className="w-full input-kelme rounded-lg px-3 py-2"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Texto del botón</span>
            <input
              value={ctaLabel}
              maxLength={40}
              onChange={(event) => setCtaLabel(event.target.value)}
              className="w-full input-kelme rounded-lg px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Enlace del botón (web, Instagram o WhatsApp)</span>
            <input
              value={ctaUrl}
              onChange={(event) => setCtaUrl(event.target.value)}
              placeholder="https://"
              className="w-full input-kelme rounded-lg px-3 py-2"
            />
          </label>
        </div>
      </div>
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
