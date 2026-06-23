import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import { DashboardShell } from '@/components/kelme/DashboardShell'

const REFEREE_NAV = [{ href: '/referee', label: 'Mis Partidos' }]

export default async function RefereeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== Role.REFEREE) redirect('/login')

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <DashboardShell nav={REFEREE_NAV} signOutAction={handleSignOut}>
      {children}
    </DashboardShell>
  )
}
