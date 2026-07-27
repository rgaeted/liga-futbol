import { KelmeLogo } from '@/components/kelme/KelmeLogo'
import { DashboardNav } from '@/components/kelme/DashboardNav'
import Link from 'next/link'

type NavItem = { href: string; label: string }

type Props = {
  nav: NavItem[]
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

export function DashboardShell({ nav, signOutAction, children }: Props) {
  return (
    <div className="min-h-screen bg-kelme-bg text-kelme-gray-900">
      <header className="sticky top-0 z-50 border-b border-kelme-border bg-kelme-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <KelmeLogo size="sm" />
          <DashboardNav nav={nav} />
          <div className="flex items-center gap-2">
            <Link href="/ayuda" className="link-nav hidden px-2 py-1 sm:inline">
              Ayuda
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="link-nav px-2 py-1">
                Salir
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-kelme-border md:hidden">
          <DashboardNav nav={nav} mobile />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  )
}
