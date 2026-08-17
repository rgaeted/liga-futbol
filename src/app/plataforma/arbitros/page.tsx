import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { listOrganizations } from '@/lib/organizations'
import { PlatformRefereesTable } from '@/components/plataforma/PlatformRefereesTable'
import { PlatformPageHeader } from '@/components/plataforma/platform-ui'

export const dynamic = 'force-dynamic'

export default async function PlataformaArbitrosPage() {
  const [users, organizations] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { refereeProfile: { isNot: null } },
          { memberships: { some: { role: MembershipRole.REFEREE } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        refereeProfile: { select: { phone: true, whatsapp: true } },
        memberships: {
          where: { role: MembershipRole.REFEREE },
          select: {
            organization: { select: { id: true, slug: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    listOrganizations(),
  ])

  return (
    <>
      <PlatformPageHeader
        eyebrow="Plataforma"
        title="Árbitros"
        subtitle="Directorio global y acceso directo a organizaciones sin invitación."
        status={`● ${users.length} árbitros`}
      />

      <PlatformRefereesTable
        referees={users.map((user) => ({
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.refereeProfile?.phone ?? null,
          whatsapp: user.refereeProfile?.whatsapp ?? null,
          organizations: user.memberships.map((m) => m.organization),
        }))}
        organizations={organizations.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
        }))}
      />
    </>
  )
}
