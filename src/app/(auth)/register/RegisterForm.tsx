'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'
import { submitJson } from '@/components/admin/submit'

export type AvailableFriendlyPlayer = {
  id: string
  firstName: string
  lastName: string
}

type Props = {
  available: AvailableFriendlyPlayer[]
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
    const result = await submitJson('/api/friendly-players/claim', 'POST', {
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
      friendlyPlayerId: String(form.get('friendlyPlayerId') ?? ''),
    })

    setLoading(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    router.push('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-kelme-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <KelmeLogo size="lg" />
        </div>
        <form onSubmit={handleSubmit} className="card-kelme space-y-4 p-8 shadow-sm">
          <div className="text-center">
            <h1 className="font-display text-xl font-bold text-kelme-gray-900">Crear cuenta</h1>
            <p className="mt-1 font-ui text-sm text-kelme-gray-400">
              Reclama tu perfil de jugador amistoso
            </p>
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
            <label htmlFor="friendlyPlayerId" className="font-ui text-sm text-kelme-gray-600">
              Elige tu perfil
            </label>
            <select
              id="friendlyPlayerId"
              name="friendlyPlayerId"
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
                  {p.lastName}, {p.firstName}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="font-ui text-sm text-kelme-red">{error}</p>}
          <button
            type="submit"
            disabled={loading || available.length === 0}
            className="btn-kelme w-full"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
          <p className="text-center font-ui text-sm text-kelme-gray-400">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-kelme-red hover:underline">
              Ingresa
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
