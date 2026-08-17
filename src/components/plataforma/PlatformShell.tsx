'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { personInitials } from '@/lib/player-name'

type NavItem = {
  href: string
  label: string
  icon: string
  count?: number
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'General',
    items: [{ href: '/plataforma', label: 'Empresas', icon: 'EM' }],
  },
  {
    label: 'Plataforma',
    items: [
      { href: '/plataforma/usuarios', label: 'Usuarios', icon: 'US' },
      { href: '/plataforma/arbitros', label: 'Árbitros', icon: 'AR' },
      { href: '/plataforma/apps', label: 'Apps móviles', icon: 'AP' },
    ],
  },
]

type Props = {
  userName: string
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

function isActive(pathname: string, href: string) {
  if (href === '/plataforma') return pathname === '/plataforma'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PlatformShell({ userName, signOutAction, children }: Props) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const initials = personInitials(userName)

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#17171a] lg:grid lg:grid-cols-[235px_1fr] lg:grid-rows-[76px_1fr]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e5e5e9] bg-white px-4 lg:col-span-2 lg:px-7">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-2xl lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ☰
          </button>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#c91f26] text-xl font-black text-white">
            LL
          </div>
          <div>
            <b className="block text-[19px] font-black tracking-[0.12em]">LIGALAB</b>
            <small className="mt-0.5 block text-[10px] font-extrabold tracking-[0.13em] text-[#aaa]">
              CONSOLA DE PLATAFORMA
            </small>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/organizaciones"
            className="hidden rounded-xl border border-[#dddde2] bg-white px-3.5 py-2.5 text-sm font-bold text-[#5f5f66] hover:bg-[#f7f7f9] sm:inline-flex"
          >
            Mis ligas
          </Link>
          <div className="flex items-center gap-2.5 border-l border-[#e5e5e9] pl-2.5 sm:pl-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#c91f26] text-sm font-extrabold text-white">
              {initials}
            </div>
            <div className="hidden leading-tight sm:block">
              <strong className="block text-sm">{userName}</strong>
              <span className="text-[11px] text-[#8d8d96]">Super admin</span>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-xs font-bold text-[#8d8d96] hover:bg-[#f7f7f9] hover:text-[#17171a]"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-[18] bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-[76px] z-[19] h-[calc(100vh-76px)] w-[260px] overflow-auto border-r border-[#e5e5e9] bg-white px-3.5 py-5 shadow-[10px_0_30px_#0002] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[102%] lg:translate-x-0'
        }`}
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="px-2.5 pb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#aaa]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-bold no-underline transition ${
                    active
                      ? 'bg-[#fff0f1] text-[#c91f26]'
                      : 'text-[#505058] hover:bg-[#f7f7f9]'
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-[9px] text-[11px] font-black ${
                      active ? 'bg-white' : 'bg-[#f4f4f6]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                  {item.count != null ? (
                    <span className="ml-auto rounded-full bg-[#f1f1f4] px-1.5 py-0.5 text-[10px] font-bold text-[#777]">
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </aside>

      <main className="min-w-0 px-4 py-6 pb-10 sm:px-7 sm:py-8 sm:pb-12 lg:px-8">{children}</main>
    </div>
  )
}
