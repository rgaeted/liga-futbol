import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/** Invalida listados admin que muestran nombres de jugadores (Person). */
export async function revalidateOrgAdminRosterPages(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  })
  if (!org) return
  revalidatePath(`/${org.slug}/admin/players`, 'page')
  revalidatePath(`/${org.slug}/admin/matches`, 'page')
}
