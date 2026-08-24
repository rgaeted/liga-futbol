import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ProductLanding } from '@/components/marketing/ProductLanding'
import { resolvePostLoginPath } from '@/lib/post-login-redirect'

export default async function HomePage() {
  const session = await auth()
  if (session?.user?.id) {
    const memberships = await db.organizationMembership.findMany({
      where: { userId: session.user.id },
      include: { organization: { select: { slug: true, status: true } } },
    })
    redirect(
      resolvePostLoginPath({
        isPlatformAdmin: session.user.isPlatformAdmin,
        memberships: memberships.map((m) => ({
          slug: m.organization.slug,
          roles: m.roles,
          status: m.organization.status,
        })),
      }),
    )
  }

  return <ProductLanding />
}
