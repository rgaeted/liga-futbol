import { listOrganizations } from '@/lib/organizations'
import { listOrgAdmins } from '@/lib/platform-org-admins'
import { PlatformOrgAdminForm } from '@/components/plataforma/PlatformOrgAdminForm'
import { PlatformOrgAdminTable } from '@/components/plataforma/PlatformOrgAdminTable'

export const dynamic = 'force-dynamic'

export default async function PlataformaUsuariosPage() {
  const [organizations, users] = await Promise.all([listOrganizations(), listOrgAdmins()])
  const active = organizations
    .filter((org) => org.status === 'ACTIVE')
    .map((org) => ({ id: org.id, slug: org.slug, name: org.name }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900">Administradores de empresa</h1>
        <p className="mt-1 font-ui text-sm text-zinc-600">
          Da acceso de administrador a una o más ligas. Puedes quitar una empresa sin borrar la
          cuenta.
        </p>
      </div>

      <PlatformOrgAdminForm organizations={active} />
      <PlatformOrgAdminTable users={users} />
    </div>
  )
}
