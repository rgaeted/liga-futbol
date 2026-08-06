'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'

type Props = {
  variant: 'league' | 'friendly'
  icon: ReactNode
  title: string
  subtitle: string
  badge?: string
  savedAtLabel: string | null
  onDiscardDraft?: () => void
  summary: ReactNode
  children: ReactNode
  submitLabel: string
  loading: boolean
  disabled?: boolean
  error?: string
  onSubmit: () => void
  backHref?: string
}

export function MatchCreateWizardShell({
  variant,
  icon,
  title,
  subtitle,
  badge,
  savedAtLabel,
  onDiscardDraft,
  summary,
  children,
  submitLabel,
  loading,
  disabled = false,
  error,
  onSubmit,
  backHref = '/admin/matches',
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
              variant === 'friendly'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-kelme-gray-900">{title}</h1>
              {badge ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-kelme-gray-500">{subtitle}</p>
            <Link href={backHref} className="mt-2 inline-block text-sm text-kelme-red hover:underline">
              ← Volver a partidos
            </Link>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          {savedAtLabel ? (
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
              Borrador guardado · {savedAtLabel}
            </span>
          ) : null}
          {onDiscardDraft ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="rounded-lg border border-kelme-border px-2 py-1.5 text-sm text-kelme-gray-600 hover:bg-kelme-gray-50"
                aria-label="Opciones de borrador"
              >
                ···
              </button>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    aria-label="Cerrar menú"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-kelme-border bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onDiscardDraft()
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-kelme-gray-700 hover:bg-kelme-gray-50"
                    >
                      Descartar borrador
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-3">{children}</div>
        <aside className="lg:sticky lg:top-6 lg:self-start">{summary}</aside>
      </div>

      <div className="rounded-xl border border-kelme-border bg-white p-4">
        <button
          type="button"
          disabled={loading || disabled}
          onClick={onSubmit}
          className="w-full rounded-xl bg-kelme-red px-4 py-3 font-semibold text-white hover:bg-kelme-red-dark disabled:opacity-50"
        >
          {loading ? 'Creando…' : submitLabel}
        </button>
        <p className="mt-2 text-center text-xs text-kelme-gray-400">
          Se guarda automáticamente como borrador
        </p>
        {error ? <p className="mt-3 text-sm text-kelme-red">{error}</p> : null}
      </div>
    </div>
  )
}
