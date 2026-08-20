import { db } from '@/lib/db'
import { RegisterForm } from './RegisterForm'

export default async function RegisterPage() {
  const available = await db.player.findMany({
    where: { person: { userId: null } },
    orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }],
    select: {
      id: true,
      primaryPosition: true,
      person: { select: { firstName: true, lastName: true } },
      categories: {
        include: { friendlyCategory: { select: { name: true } } },
      },
    },
  })

  return (
    <RegisterForm
      available={available.map((p) => ({
        id: p.id,
        firstName: p.person.firstName,
        lastName: p.person.lastName,
        primaryPosition: p.primaryPosition,
        categoryName: p.categories.map((c) => c.friendlyCategory.name).join(', '),
      }))}
    />
  )
}
