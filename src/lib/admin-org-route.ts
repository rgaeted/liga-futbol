import { MembershipRole } from '@/lib/membership-role'
import { requireOrgRoleForSlug } from '@/lib/tenant-access'

export async function requireOrgAdminForSlug(organizationSlug: string) {
  return requireOrgRoleForSlug(organizationSlug, [MembershipRole.ORG_ADMIN])
}

export function mapAdminOrgRouteError(error: unknown): { message: string; status: number } | null {
  if (error instanceof Error && error.message === 'Unauthorized') {
    return { message: 'No autorizado.', status: 401 }
  }
  return null
}

export function mapHeroImageUploadError(error: unknown): { message: string; status: number } {
  const auth = mapAdminOrgRouteError(error)
  if (auth) return auth

  if (error instanceof Error) {
    if (error.message === 'Supabase no configurado') {
      return { message: 'Almacenamiento de imágenes no configurado.', status: 503 }
    }
    if (error.message) {
      return { message: error.message, status: 500 }
    }
  }

  return { message: 'No se pudo subir la imagen.', status: 500 }
}
