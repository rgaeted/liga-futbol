import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role, isPlayerAreaRole } from '@/lib/roles'
import { DashboardShell } from '@/components/kelme/DashboardShell'

const PLAYER_NAV = [
  { href: '/player', label: 'Mi Panel' },
  { href: '/player/matches', label: 'Mis Partidos' },
  { href: '/player/friendly-matches', label: 'Amistosos (DT)' },
]

const FRIENDLY_COACH_NAV = [{ href: '/player/friendly-matches', label: 'Amistosos (DT)' }]

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || !isPlayerAreaRole(session.user.role as Role)) redirect('/login')

  const role = session.user.role as Role
  const nav = role === Role.FRIENDLY_COACH ? FRIENDLY_COACH_NAV : PLAYER_NAV

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <DashboardShell nav={nav} signOutAction={handleSignOut}>
      {children}
    </DashboardShell>
  )
}
