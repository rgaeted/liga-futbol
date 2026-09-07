'use client'

import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'
import { formatFriendlyPlayerLabel } from '@/lib/friendly-player-options'

export type AvailablePlayer = {
  id: string
  firstName: string
  lastName: string
  primaryPosition: string | null
  categoryName?: string
}

type Props = {
  available?: AvailablePlayer[]
  organizationSlug?: string | null
  organizationName?: string | null
  lockedPlayer?: AvailablePlayer | null
  claimToken?: string | null
  inviteInvalid?: boolean
  onSuccess?: () => void
}

export function RegisterForm({
  available = [],
  organizationSlug = null,
  organizationName = null,
  lockedPlayer = null,
  claimToken = null,
  inviteInvalid = false,
  onSuccess,
}: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isPersonalInvite = Boolean(lockedPlayer && claimToken)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const password = String(form.get('password') ?? '')
    const passwordConfirm = String(form.get('passwordConfirm') ?? '')
    if (password !== passwordConfirm) {
      setLoading(false)
      setError('Las contraseñas no coinciden.')
      return
    }

    const playerId = isPersonalInvite
      ? lockedPlayer!.id
      : String(form.get('playerId') ?? '')
    if (!playerId) {
      setLoading(false)
      setError('Selecciona tu perfil en la lista.')
      return
    }

    const result = await submitJson('/api/players/claim', 'POST', {
      email: String(form.get('email') ?? '').trim(),
      password,
      playerId,
      ...(isPersonalInvite && claimToken ? { token: claimToken } : {}),
      ...(!isPersonalInvite && organizationSlug ? { organizationSlug } : {}),
    })

    setLoading(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    onSuccess?.()
  }

  if (isPersonalInvite) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center">
          <h1 className="font-display text-xl font-black text-[#E8E4D8]">Crear cuenta</h1>
          <p className="mt-1 font-ui text-sm text-[#8A938C]">Reclama tu perfil de jugador</p>
        </div>
        <input name="email" type="email" placeholder="Email" required className="input-kelme" />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          required
          minLength={6}
          autoComplete="new-password"
          className="input-kelme"
        />
        <input
          name="passwordConfirm"
          type="password"
          placeholder="Repite la contraseña"
          required
          minLength={6}
          autoComplete="new-password"
          className="input-kelme"
        />
        <div className="space-y-1">
          <p className="font-ui text-sm font-bold text-[#8A938C]">Tu perfil</p>
          <p className="rounded-xl border border-kelme-border bg-[#0B1210] px-3.5 py-3 font-ui text-sm font-semibold text-[#E8E4D8]">
            {formatFriendlyPlayerLabel(lockedPlayer!)}
            {lockedPlayer!.categoryName ? ` — ${lockedPlayer!.categoryName}` : ''}
          </p>
        </div>
        {error ? <p className="font-ui text-sm font-semibold text-org-primary">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn-kelme w-full">
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <h1 className="font-display text-xl font-black text-[#E8E4D8]">Crear cuenta</h1>
        <p className="mt-1 font-ui text-sm text-[#8A938C]">
          {organizationName
            ? `Elige tu nombre en ${organizationName} y crea tu acceso.`
            : 'Elige tu perfil en la lista y crea tu acceso.'}
        </p>
      </div>
      {inviteInvalid ? (
        <p className="rounded-xl border border-kelme-border bg-[#0B1210] px-3.5 py-3 font-ui text-sm text-[#8A938C]">
          El link personal que abriste ya no sirve. Puedes registrarte eligiendo tu nombre abajo o
          pedir un link nuevo al administrador.
        </p>
      ) : null}
      <input name="email" type="email" placeholder="Email" required className="input-kelme" />
      <input
        name="password"
        type="password"
        placeholder="Contraseña"
        required
        minLength={6}
        autoComplete="new-password"
        className="input-kelme"
      />
      <input
        name="passwordConfirm"
        type="password"
        placeholder="Repite la contraseña"
        required
        minLength={6}
        autoComplete="new-password"
        className="input-kelme"
      />
      <div className="space-y-1">
        <label htmlFor="playerId" className="font-ui text-sm font-bold text-[#8A938C]">
          Elige tu perfil
        </label>
        <select
          id="playerId"
          name="playerId"
          required
          disabled={available.length === 0}
          className="input-kelme w-full"
          defaultValue=""
        >
          <option value="" disabled>
            {available.length === 0 ? 'No hay perfiles disponibles' : 'Selecciona…'}
          </option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {formatFriendlyPlayerLabel(p)}
              {p.categoryName ? ` — ${p.categoryName}` : ''}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="font-ui text-sm font-semibold text-org-primary">{error}</p> : null}
      <button
        type="submit"
        disabled={loading || available.length === 0}
        className="btn-kelme w-full"
      >
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}
