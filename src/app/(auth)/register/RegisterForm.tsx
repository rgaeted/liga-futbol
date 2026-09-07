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
  lockedPlayer?: AvailablePlayer | null
  claimToken?: string | null
  inviteInvalid?: boolean
  onSuccess?: () => void
}

export function RegisterForm({
  lockedPlayer = null,
  claimToken = null,
  inviteInvalid = false,
  onSuccess,
}: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const canRegister = Boolean(lockedPlayer && claimToken)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!lockedPlayer || !claimToken) return

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

    const result = await submitJson('/api/players/claim', 'POST', {
      email: String(form.get('email') ?? '').trim(),
      password,
      playerId: lockedPlayer.id,
      token: claimToken,
    })

    setLoading(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    onSuccess?.()
  }

  if (inviteInvalid) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-display text-xl font-black text-[#E8E4D8]">Link no válido</h1>
        <p className="font-ui text-sm text-[#8A938C]">
          Este link de registro ya no sirve o no corresponde a un perfil disponible. Pide uno nuevo al
          administrador o ingresa si ya tienes cuenta.
        </p>
      </div>
    )
  }

  if (!canRegister) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-display text-xl font-black text-[#E8E4D8]">Crear cuenta</h1>
        <p className="font-ui text-sm text-[#8A938C]">
          Para registrarte necesitas el link personal que te envió el administrador de tu liga. Con
          ese link solo podrás reclamar tu propio perfil.
        </p>
      </div>
    )
  }

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
