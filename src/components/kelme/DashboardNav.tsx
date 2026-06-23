'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; label: string }

export function DashboardNav({ nav, mobile }: { nav: NavItem[]; mobile?: boolean }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (pathname === href) return true
    const isRoot = ['/admin', '/player', '/coach', '/referee'].includes(href)
    if (isRoot) return false
    return pathname.startsWith(href + '/')
  }

  return (
    <nav className={mobile ? 'flex gap-1 overflow-x-auto px-4 py-2 md:hidden' : 'hidden items-center gap-1 md:flex'}>
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            isActive(item.href)
              ? `link-nav-active whitespace-nowrap px-3 py-2 ${mobile ? 'text-xs' : ''}`
              : `link-nav whitespace-nowrap px-3 py-2 ${mobile ? 'text-xs' : ''}`
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
