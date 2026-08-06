'use client'

import type { ReactNode } from 'react'

type Props = {
  step: number
  title: string
  subtitle?: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

export function WizardStep({ step, title, subtitle, isOpen, onToggle, children }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-kelme-border bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-kelme-gray-50"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isOpen
              ? 'bg-kelme-red text-white'
              : 'bg-kelme-gray-100 text-kelme-gray-600'
          }`}
        >
          {step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-kelme-gray-900">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-sm text-kelme-gray-500">{subtitle}</span>
          ) : null}
        </span>
        <span className="text-kelme-gray-400" aria-hidden>
          {isOpen ? '▼' : '▶'}
        </span>
      </button>
      {isOpen ? <div className="border-t border-kelme-border px-4 py-4">{children}</div> : null}
    </section>
  )
}
