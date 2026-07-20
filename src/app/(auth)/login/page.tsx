'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Credenciales inválidas')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-kelme-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <KelmeLogo size="lg" />
        </div>
        <form onSubmit={handleSubmit} className="card-kelme space-y-4 p-8 shadow-sm">
          <div className="text-center">
            <h1 className="font-display text-xl font-bold text-kelme-gray-900">Ingresar</h1>
            <p className="mt-1 font-ui text-sm text-kelme-gray-400">
              Accede a tu panel de Torneos Kelme
            </p>
          </div>
          <input name="email" type="email" placeholder="Email" required className="input-kelme" />
          <input name="password" type="password" placeholder="Contraseña" required className="input-kelme" />
          {error && <p className="font-ui text-sm text-kelme-red">{error}</p>}
          <button type="submit" disabled={loading} className="btn-kelme w-full">
            {loading ? 'Entrando...' : 'Ingresar'}
          </button>
          <p className="text-center font-ui text-sm text-kelme-gray-400">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-kelme-red hover:underline">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
