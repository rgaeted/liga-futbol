import type { Metadata } from 'next'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { HelpPageContent } from '@/components/help/HelpPageContent'

export const metadata: Metadata = {
  title: 'Guía de uso · Torneos Kelme',
  description:
    'Documentación para jugadores, directores técnicos, árbitros y administradores de Torneos Kelme.',
}

export default function AyudaPage() {
  return (
    <MarketingShell active="ayuda">
      <HelpPageContent />
    </MarketingShell>
  )
}
