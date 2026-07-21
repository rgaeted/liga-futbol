import { db } from '@/lib/db'
import { RegisterForm } from './RegisterForm'

export default async function RegisterPage() {
  const available = await db.friendlyPlayer.findMany({
    where: { userId: null },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      primaryPosition: true,
      categories: {
        include: { friendlyCategory: { select: { name: true } } },
      },
    },
  })

  return (
    <RegisterForm
      available={available.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        primaryPosition: p.primaryPosition,
        categoryName: p.categories.map((c) => c.friendlyCategory.name).join(', '),
      }))}
    />
  )
}
