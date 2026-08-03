'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type AdminNavItem = {
  href: string
  label: string
  activePrefixes?: string[]
}

function defaultIsActive(href: string, pathname: string) {
  if (pathname === href) return true
  if (href === '/admin') return pathname === '/admin'
  return pathname.startsWith(href + '/')
}

export function AdminNav({
  nav,
  mobile,
}: {
  nav: AdminNavItem[]
  mobile?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav
      className={
        mobile
          ? 'flex gap-1 overflow-x-auto px-4 py-2 lg:hidden'
          : 'hidden min-w-0 flex-1 flex-wrap items-center gap-1 lg:flex'
      }
    >
      {nav.map((item) => {
        const active = item.activePrefixes
          ? item.activePrefixes.some((prefix) => defaultIsActive(prefix, pathname))
          : defaultIsActive(item.href, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? 'whitespace-nowrap rounded-lg bg-[#fdf2f3] px-3 py-2 text-sm font-semibold text-[#b91c1c]'
                : 'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
