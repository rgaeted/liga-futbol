import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import { DashboardShell } from '@/components/kelme/DashboardShell'

const PLAYER_NAV = [
  { href: '/player', label: 'Mi Panel' },
  { href: '/player/matches', label: 'Mis Partidos' },
]

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== Role.PLAYER) redirect('/login')

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <DashboardShell nav={PLAYER_NAV} signOutAction={handleSignOut}>
      {children}
    </DashboardShell>
  )
}
