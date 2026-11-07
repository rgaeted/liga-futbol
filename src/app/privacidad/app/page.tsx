import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { PLATFORM_PRIVACY_META } from '@/lib/legal/privacy-policy-content'
import { MOBILE_APP_PRIVACY_SECTIONS } from '@/lib/mobile/privacy-content'

export const metadata: Metadata = {
  title: 'Privacidad — App móvil · LigaLab',
  description:
    'Política de privacidad de las apps móviles de LigaLab y complemento a la política general de la plataforma.',
}

export default function MobileAppPrivacyPage() {
  return (
    <MarketingShell showLogin>
      <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <Link href="/privacidad" className="text-sm font-bold text-[#8A938C] hover:text-[#E8E4D8]">
          ← Política general
        </Link>
        <header className="mt-4 border-b border-[#2A3A32] pb-6">
          <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-black text-[#E8E4D8]">
            Privacidad de la app móvil
          </h1>
          <p className="mt-3 text-base text-[#8A938C]">
            Complemento para las apps móviles de LigaLab. La política completa está en{' '}
            <Link href="/privacidad" className="font-semibold text-org-primary hover:underline">
              /privacidad
            </Link>
            .
          </p>
          <p className="mt-3 font-ui text-xs text-[#8A938C]">
            Última actualización: {PLATFORM_PRIVACY_META.lastUpdated} · Versión{' '}
            {PLATFORM_PRIVACY_META.version}
          </p>
        </header>
        <div className="mt-8 space-y-8">
          {MOBILE_APP_PRIVACY_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-extrabold text-[#E8E4D8]">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#C8CEC9]">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </MarketingShell>
  )
}
