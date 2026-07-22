import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role, getDashboardPath } from '@/lib/roles'
import { DashboardShell } from '@/components/kelme/DashboardShell'

export const dynamic = 'force-dynamic'

const ADMIN_NAV = [
  { href: '/admin', label: 'Inicio' },
  { href: '/admin/teams', label: 'Equipos' },
  { href: '/admin/players', label: 'Jugadores' },
  { href: '/admin/friendly-categories', label: 'Categorías amistosas' },
  { href: '/admin/friendly-players', label: 'Jugadores amistosos' },
  { href: '/admin/matches', label: 'Partidos' },
  { href: '/admin/seasons', label: 'Temporadas' },
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
    <DashboardShell nav={ADMIN_NAV} signOutAction={handleSignOut}>
      {children}
    </DashboardShell>
  )
}

