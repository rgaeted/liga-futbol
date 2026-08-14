import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { pausedOrganizationPayload } from '@/lib/organization-status'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const org = await db.organization.findUnique({ where: { slug: organizationSlug } })
  if (!org) notFound()
  if (org.status === 'PAUSED') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p>{pausedOrganizationPayload().error}</p>
      </main>
    )
  }

  return (
    <div
      style={
        {
          ['--org-primary' as string]: org.primaryColor,
          ['--org-secondary' as string]: org.secondaryColor,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
