'use client'

import { signIn } from 'next-auth/react'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'))
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

    if (result?.error) {
      setLoading(false)
      setError('Credenciales inválidas')
      return
    }

    // Recarga completa para que la cookie de sesión viaje en la siguiente petición.
    window.location.assign(callbackUrl)
  }

  return (
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
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-kelme-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <KelmeLogo size="lg" />
        </div>
        <Suspense
          fallback={
            <div className="card-kelme p-8 text-center font-ui text-sm text-kelme-gray-400">
              Cargando…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
