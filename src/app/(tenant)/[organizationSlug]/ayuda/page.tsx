import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { HelpPageContent } from '@/components/help/HelpPageContent'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}): Promise<Metadata> {
  const { organizationSlug } = await params
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { name: true },
  })
  if (!org) return {}

  return {
    title: `Guía de uso · ${org.name}`,
    description: `Documentación para jugadores, directores técnicos, árbitros y administradores de ${org.name}.`,
  }
}

export default function AyudaPage() {
  return (
    <MarketingShell active="ayuda">
      <HelpPageContent />
    </MarketingShell>
  )
}
