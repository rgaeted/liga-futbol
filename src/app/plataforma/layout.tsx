import { auth, signOutAndClearOrg } from '@/lib/auth'
import { PlatformShell } from '@/components/plataforma/PlatformShell'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) {
    redirect('/login')
  }

  async function signOutAction() {
    'use server'
    await signOutAndClearOrg('/login')
  }

  return (
    <PlatformShell userName={session.user.name ?? 'Admin'} signOutAction={signOutAction}>
      {children}
    </PlatformShell>
  )
}
