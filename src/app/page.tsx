import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/roles'
import { Role } from '@prisma/client'

export default async function HomePage() {
  const session = await auth()
  if (!session) redirect('/login')
  redirect(getDashboardPath(session.user.role as Role))
}
