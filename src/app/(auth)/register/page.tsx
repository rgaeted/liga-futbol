import { db } from '@/lib/db'
import { RegisterForm } from './RegisterForm'

export default async function RegisterPage() {
  const available = await db.friendlyPlayer.findMany({
    where: { userId: null },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: { id: true, firstName: true, lastName: true },
  })

  return <RegisterForm available={available} />
}
