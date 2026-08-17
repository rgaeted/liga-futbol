'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlatformPanel,
  PlatformPanelInner,
  platformBtnPrimaryClass,
  platformInputClass,
} from '@/components/plataforma/platform-ui'

export function OrganizationCreateForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const payload = {
      slug: String(form.get('slug') ?? ''),
      name: String(form.get('name') ?? ''),
      primaryColor: String(form.get('primaryColor') ?? ''),
      secondaryColor: String(form.get('secondaryColor') ?? ''),
      adminEmail: String(form.get('adminEmail') ?? ''),
      adminName: String(form.get('adminName') ?? ''),
      adminPassword: String(form.get('adminPassword') ?? ''),
    }

    const res = await fetch('/api/plataforma/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setLoading(false)
      setError('No pudimos crear la empresa. Revisa los datos e intenta de nuevo.')
      return
    }

    router.refresh()
    e.currentTarget.reset()
    setLoading(false)
  }

  return (
    <PlatformPanel>
      <PlatformPanelInner>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="text-[22px] font-black text-[#17171a]">Crear empresa</h2>
            <p className="mt-1 text-sm text-[#777]">
              Registra una nueva liga y asigna su primer administrador.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="slug" placeholder="slug (ej. liga-sur)" required className={platformInputClass} />
            <input name="name" placeholder="Nombre de la empresa" required className={platformInputClass} />
            <input name="primaryColor" placeholder="#CD212A" required className={platformInputClass} />
            <input name="secondaryColor" placeholder="#FFFFFF" required className={platformInputClass} />
            <input
              name="adminEmail"
              type="email"
              placeholder="Email admin"
              required
              className={platformInputClass}
            />
            <input name="adminName" placeholder="Nombre admin" required className={platformInputClass} />
            <input
              name="adminPassword"
              type="password"
              placeholder="Contraseña admin"
              required
              className={`${platformInputClass} sm:col-span-2`}
            />
          </div>
          {error && <p className="text-sm font-semibold text-[#c91f26]">{error}</p>}
          <button type="submit" disabled={loading} className={platformBtnPrimaryClass}>
            {loading ? 'Creando…' : 'Crear empresa'}
          </button>
        </form>
      </PlatformPanelInner>
    </PlatformPanel>
  )
}
