'use client'

import { signIn } from 'next-auth/react'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

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

    const params = new URLSearchParams({ redirect: '1' })
    if (callbackUrl !== '/') {
      params.set('callbackUrl', callbackUrl)
    }
    window.location.assign(`/api/auth/post-login?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="card-kelme space-y-4 p-8">
      <div className="text-center">
        <h1 className="font-display text-xl font-black text-[#E8E4D8]">Ingresar</h1>
        <p className="mt-1 font-ui text-sm text-[#8A938C]">Accede a LigaLab</p>
      </div>
      <input name="email" type="email" placeholder="Email" required className="input-kelme" />
      <input name="password" type="password" placeholder="Contraseña" required className="input-kelme" />
      {error && <p className="font-ui text-sm font-semibold text-org-primary">{error}</p>}
      <button type="submit" disabled={loading} className="btn-kelme w-full">
        {loading ? 'Entrando…' : 'Ingresar'}
      </button>
      <p className="text-center font-ui text-sm text-[#8A938C]">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-bold text-org-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
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
        <Suspense
          fallback={
            <div className="card-kelme p-8 text-center font-ui text-sm text-[#8A938C]">
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
