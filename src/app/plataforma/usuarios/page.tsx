import { listOrganizations } from '@/lib/organizations'
import { listOrgAdmins } from '@/lib/platform-org-admins'
import { PlatformOrgAdminForm } from '@/components/plataforma/PlatformOrgAdminForm'
import { PlatformOrgAdminTable } from '@/components/plataforma/PlatformOrgAdminTable'
import { PlatformPageHeader } from '@/components/plataforma/platform-ui'

export const dynamic = 'force-dynamic'

export default async function PlataformaUsuariosPage() {
  const [organizations, users] = await Promise.all([listOrganizations(), listOrgAdmins()])
  const active = organizations
    .filter((org) => org.status === 'ACTIVE')
    .map((org) => ({ id: org.id, slug: org.slug, name: org.name }))

  return (
    <>
      <PlatformPageHeader
        eyebrow="Plataforma"
        title="Administradores de empresa"
        subtitle="Da acceso de administrador a una o más ligas. Puedes quitar una empresa sin borrar la cuenta."
        status={`● ${users.length} admins`}
      />

      <div className="grid gap-[18px xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,1fr)]">
        <PlatformOrgAdminForm organizations={active} />
        <PlatformOrgAdminTable users={users} />
      </div>
    </>
  )
}
