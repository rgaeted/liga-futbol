import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import { DashboardShell } from '@/components/kelme/DashboardShell'

const ADMIN_NAV = [
  { href: '/admin', label: 'Inicio' },
  { href: '/admin/teams', label: 'Equipos' },
  { href: '/admin/players', label: 'Jugadores' },
  { href: '/admin/matches', label: 'Partidos' },
  { href: '/admin/seasons', label: 'Temporadas' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== Role.ADMIN) redirect('/login')

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
