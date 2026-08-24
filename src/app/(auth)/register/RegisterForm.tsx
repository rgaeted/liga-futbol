'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
}

export function RegisterForm({ available }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const result = await submitJson('/api/players/claim', 'POST', {
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
      playerId: String(form.get('playerId') ?? ''),
    })

    setLoading(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    router.push('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1210] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-org-primary text-xl font-black text-[#E8E4D8]">
            LL
          </div>
          <div className="text-center">
            <span className="font-display text-2xl font-black tracking-[0.08em] text-[#E8E4D8]">
              LIGALAB
            </span>
            <p className="mt-0.5 text-[10px] font-extrabold tracking-[0.13em] text-[#8A938C]">
              GESTIÓN DEPORTIVA
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="card-kelme space-y-4 p-8">
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
          {error && <p className="font-ui text-sm font-semibold text-org-primary">{error}</p>}
          <button
            type="submit"
            disabled={loading || available.length === 0}
            className="btn-kelme w-full"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
          <p className="text-center font-ui text-sm text-[#8A938C]">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-bold text-org-primary hover:underline">
              Ingresa
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
