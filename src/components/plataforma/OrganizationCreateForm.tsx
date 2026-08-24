'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlatformPanel,
  PlatformPanelInner,
  platformBtnPrimaryClass,
  platformInputClass,
} from '@/components/plataforma/platform-ui'

const DEFAULT_PRIMARY = '#c91f26'
const DEFAULT_SECONDARY = '#ffffff'

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-[#8A938C]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-[#2A3A32] bg-kelme-surface p-1"
          aria-label={`${label} visual`}
        />
        <input
          name={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
          required
          className={platformInputClass}
        />
      </div>
    </div>
  )
}

export function OrganizationCreateForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY)
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY)
  const [assignAdmin, setAssignAdmin] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const payload: Record<string, string> = {
      slug: String(form.get('slug') ?? ''),
      name: String(form.get('name') ?? ''),
      primaryColor: String(form.get('primaryColor') ?? primaryColor),
      secondaryColor: String(form.get('secondaryColor') ?? secondaryColor),
    }

    if (assignAdmin) {
      payload.adminEmail = String(form.get('adminEmail') ?? '')
      payload.adminName = String(form.get('adminName') ?? '')
      const password = String(form.get('adminPassword') ?? '')
      if (password.length > 0) {
        payload.adminPassword = password
      }
    }

    const res = await fetch('/api/plataforma/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setLoading(false)
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null
      setError(
        typeof body?.error === 'string'
          ? body.error
          : 'No pudimos crear la empresa. Revisa los datos e intenta de nuevo.',
      )
      return
    }

    router.refresh()
    e.currentTarget.reset()
    setPrimaryColor(DEFAULT_PRIMARY)
    setSecondaryColor(DEFAULT_SECONDARY)
    setAssignAdmin(false)
    setLoading(false)
  }

  return (
    <PlatformPanel>
      <PlatformPanelInner>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="text-[22px] font-black text-[#E8E4D8]">Crear empresa</h2>
            <p className="mt-1 text-sm text-[#8A938C]">
              Registra una nueva liga. Puedes asignar un administrador ahora o hacerlo después en
              Usuarios.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input name="slug" placeholder="slug (ej. liga-sur)" required className={platformInputClass} />
            <input name="name" placeholder="Nombre de la empresa" required className={platformInputClass} />
            <ColorField
              label="Color primario"
              name="primaryColor"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorField
              label="Color secundario"
              name="secondaryColor"
              value={secondaryColor}
              onChange={setSecondaryColor}
            />
          </div>

          <div className="rounded-[14px] border border-[#2A3A32] bg-[#0B1210] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={assignAdmin}
                onChange={(e) => setAssignAdmin(e.target.checked)}
                className="mt-0.5 rounded accent-[color:var(--org-primary)]"
              />
              <span>
                <span className="block text-sm font-extrabold text-[#E8E4D8]">
                  Asignar administrador al crear
                </span>
                <span className="mt-0.5 block text-xs text-[#8A938C]">
                  Si no marcas esto, crea la empresa y luego da acceso desde Plataforma → Usuarios.
                </span>
              </span>
            </label>

            {assignAdmin ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  name="adminEmail"
                  type="email"
                  placeholder="Email admin"
                  required
                  className={platformInputClass}
                />
                <input
                  name="adminName"
                  placeholder="Nombre admin"
                  required
                  minLength={2}
                  className={platformInputClass}
                />
                <input
                  name="adminPassword"
                  type="password"
                  placeholder="Contraseña (solo cuenta nueva)"
                  minLength={6}
                  className={`${platformInputClass} sm:col-span-2`}
                />
                <p className="text-xs text-[#8A938C] sm:col-span-2">
                  Si el correo ya existe, se reutiliza la cuenta sin cambiar la contraseña.
                </p>
              </div>
            ) : null}
          </div>

          {error && <p className="text-sm font-semibold text-org-primary">{error}</p>}
          <button type="submit" disabled={loading} className={platformBtnPrimaryClass}>
            {loading ? 'Creando…' : 'Crear empresa'}
          </button>
        </form>
      </PlatformPanelInner>
    </PlatformPanel>
  )
}
