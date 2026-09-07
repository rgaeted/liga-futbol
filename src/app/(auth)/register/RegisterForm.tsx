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
  available: AvailablePlayer[]
  lockedPlayerId?: string | null
  onSuccess?: () => void
}

export function RegisterForm({ available, lockedPlayerId, onSuccess }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const lockedPlayer = lockedPlayerId
    ? available.find((player) => player.id === lockedPlayerId) ?? null
    : null
  const lockedMissing = Boolean(lockedPlayerId) && !lockedPlayer

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

    const playerId = lockedPlayer?.id ?? String(form.get('playerId') ?? '')
    const result = await submitJson('/api/players/claim', 'POST', {
      email: String(form.get('email') ?? '').trim(),
      password,
      playerId,
    })

    setLoading(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    onSuccess?.()
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
      {lockedMissing ? (
        <p className="font-ui text-sm font-semibold text-org-primary">
          Este perfil ya tiene cuenta o no está disponible. Ingresa con tu email.
        </p>
      ) : lockedPlayer ? (
        <div className="space-y-1">
          <p className="font-ui text-sm font-bold text-[#8A938C]">Tu perfil</p>
          <p className="rounded-xl border border-kelme-border bg-[#0B1210] px-3.5 py-3 font-ui text-sm font-semibold text-[#E8E4D8]">
            {formatFriendlyPlayerLabel(lockedPlayer)}
            {lockedPlayer.categoryName ? ` — ${lockedPlayer.categoryName}` : ''}
          </p>
        </div>
      ) : (
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
      )}
      {error ? <p className="font-ui text-sm font-semibold text-org-primary">{error}</p> : null}
      <button
        type="submit"
        disabled={loading || lockedMissing || (!lockedPlayer && available.length === 0)}
        className="btn-kelme w-full"
      >
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}
