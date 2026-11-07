import Link from 'next/link'
import type { LegalSection } from '@/lib/legal/privacy-policy-content'

type Props = {
  title: string
  lead: string
  sections: LegalSection[]
  lastUpdated: string
  version: string
  backHref?: string
  backLabel?: string
}

export function LegalDocumentPage({
  title,
  lead,
  sections,
  lastUpdated,
  version,
  backHref = '/',
  backLabel = 'Volver al inicio',
}: Props) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      {backHref ? (
        <Link href={backHref} className="text-sm font-bold text-[#8A938C] hover:text-[#E8E4D8]">
          ← {backLabel}
        </Link>
      ) : null}
      <header className="mt-4 border-b border-[#2A3A32] pb-6">
        <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-black text-[#E8E4D8]">
          {title}
        </h1>
        <p className="mt-3 text-base text-[#8A938C]">{lead}</p>
        <p className="mt-3 font-ui text-xs text-[#8A938C]">
          Última actualización: {lastUpdated} · Versión {version}
        </p>
      </header>
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-lg font-extrabold text-[#E8E4D8]">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-relaxed text-[#C8CEC9]">
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#C8CEC9]">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      <footer className="mt-10 border-t border-[#2A3A32] pt-6 font-ui text-xs text-[#8A938C]">
        <p>
          También puedes leer la{' '}
          <Link href="/privacidad/app" className="font-semibold text-[#E8E4D8] hover:text-org-primary">
            política específica de la app móvil
          </Link>
          .
        </p>
      </footer>
    </article>
  )
}
