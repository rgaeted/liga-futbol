import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role } from '@/lib/roles'
import { DashboardShell } from '@/components/kelme/DashboardShell'

const COACH_NAV = [
  { href: '/coach', label: 'Partidos' },
  { href: '/coach/evaluations', label: 'Evaluaciones' },
]

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== Role.COACH) redirect('/login')

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <DashboardShell nav={COACH_NAV} signOutAction={handleSignOut}>
      {children}
    </DashboardShell>
  )
}
