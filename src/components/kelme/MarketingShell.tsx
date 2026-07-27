import Link from 'next/link'
import { KelmeLogo } from './KelmeLogo'

type Props = {
  children: React.ReactNode
  /** Resalta el enlace activo en el header */
  active?: 'home' | 'ayuda'
}

export function MarketingShell({ children, active }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-kelme-bg">
      <header className="border-b border-kelme-border bg-kelme-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="shrink-0">
            <KelmeLogo size="md" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/ayuda"
              className={`font-ui text-sm font-medium ${
                active === 'ayuda'
                  ? 'text-kelme-red'
                  : 'text-kelme-gray-600 hover:text-kelme-gray-900'
              }`}
            >
              Guía de uso
            </Link>
            <Link href="/login" className="btn-kelme text-sm">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t border-kelme-border bg-kelme-surface py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-center font-ui text-xs text-kelme-gray-400 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Torneos Kelme · KELME</span>
          <Link href="/ayuda" className="hover:text-kelme-gray-600">
            Guía de uso
          </Link>
        </div>
      </footer>
    </div>
  )
}
