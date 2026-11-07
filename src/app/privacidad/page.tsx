import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { PLATFORM_PRIVACY_META, PLATFORM_PRIVACY_SECTIONS } from '@/lib/legal/privacy-policy-content'

export const metadata: Metadata = {
  title: PLATFORM_PRIVACY_META.title,
  description: PLATFORM_PRIVACY_META.description,
}

export default function PrivacyPolicyPage() {
  return (
    <MarketingShell active="home" showLogin>
      <LegalDocumentPage
        title="Política de Privacidad"
        lead={PLATFORM_PRIVACY_META.description}
        sections={PLATFORM_PRIVACY_SECTIONS}
        lastUpdated={PLATFORM_PRIVACY_META.lastUpdated}
        version={PLATFORM_PRIVACY_META.version}
      />
    </MarketingShell>
  )
}
