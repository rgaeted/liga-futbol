import type { Metadata } from 'next'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { MOBILE_APP_PRIVACY_SECTIONS } from '@/lib/mobile/privacy-content'

export const metadata: Metadata = {
  title: 'Privacidad — App móvil · Torneos Kelme',
  description:
    'Política de privacidad de la app móvil pública de Torneos Kelme por edición de liga.',
}

export default function MobileAppPrivacyPage() {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 py-10 prose prose-neutral">
        <h1>Privacidad de la app móvil</h1>
        <p className="lead">
          Esta política aplica a las apps móviles publicadas por edición de liga en Torneos Kelme.
        </p>
        {MOBILE_APP_PRIVACY_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <p className="text-sm text-muted-foreground">
          Última actualización: agosto 2026. Consultas: soporte en torneos-kelme.vercel.app.
        </p>
      </article>
    </MarketingShell>
  )
}
