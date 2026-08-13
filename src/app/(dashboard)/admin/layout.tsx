import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role, getDashboardPath } from '@/lib/roles'
import { AdminShell } from '@/components/admin/AdminShell'
import type { AdminNavItem } from '@/components/admin/AdminNav'

export const dynamic = 'force-dynamic'

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Inicio' },
  { href: '/admin/teams', label: 'Equipos' },
  { href: '/admin/players', label: 'Jugadores' },
  { href: '/admin/matches', label: 'Partidos' },
  { href: '/admin/seasons', label: 'Temporadas' },
  {
    href: '/admin/content',
    label: 'Contenido',
    activePrefixes: [
      '/admin/content',
      '/admin/content/articles',
      '/admin/content/galleries',
      '/admin/content/sponsors',
    ],
  },
  {
    href: '/admin/friendly-players',
    label: 'Amistosos',
    activePrefixes: ['/admin/friendly-players', '/admin/friendly-categories'],
  },
  { href: '/admin/users', label: 'Usuarios' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/admin')
  if (session.user.role !== Role.ADMIN) {
    redirect(getDashboardPath(session.user.role))
  }

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <AdminShell nav={ADMIN_NAV} userName={session.user.name ?? 'Admin'} signOutAction={handleSignOut}>
      {children}
    </AdminShell>
  )
}
