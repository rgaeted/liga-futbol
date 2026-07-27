import Link from 'next/link'
import { HELP_QUICK_LINKS, HELP_SECTIONS, type HelpBlock } from '@/lib/help-content'

function HelpBlockView({ block }: { block: HelpBlock }) {
  if (block.type === 'paragraph') {
    return <p className="font-body leading-relaxed text-kelme-gray-600">{block.text}</p>
  }

  if (block.type === 'note') {
    return (
      <div className="rounded-lg border border-kelme-red/20 bg-kelme-red/5 px-4 py-3">
        <p className="font-body text-sm leading-relaxed text-kelme-gray-700">{block.text}</p>
      </div>
    )
  }

  const ListTag = block.type === 'steps' ? 'ol' : 'ul'
  const listClass =
    block.type === 'steps'
      ? 'list-decimal space-y-2 pl-5 font-body text-kelme-gray-600'
      : 'list-disc space-y-2 pl-5 font-body text-kelme-gray-600'

  return (
    <div className="space-y-2">
      {block.title && (
        <p className="font-ui text-sm font-semibold text-kelme-gray-900">{block.title}</p>
      )}
      <ListTag className={listClass}>
        {block.items.map((item) => (
          <li key={item} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ListTag>
    </div>
  )
}

export function HelpPageContent() {
  return (
    <main className="flex-1">
      <section className="border-b border-kelme-border bg-kelme-surface">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <p className="font-ui text-sm font-semibold uppercase tracking-widest text-kelme-red">
            Documentación
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-kelme-gray-900 md:text-4xl">
            Guía de uso
          </h1>
          <p className="mt-3 max-w-2xl font-body text-lg text-kelme-gray-600">
            Aprende a usar Torneos Kelme según tu rol: marcador en vivo, citaciones, arbitraje y
            administración del torneo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="btn-kelme">
              Iniciar sesión
            </Link>
            <Link href="/" className="btn-kelme-outline">
              Ver partidos en vivo
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          <nav
            aria-label="Contenido de la guía"
            className="lg:sticky lg:top-6 lg:self-start"
          >
            <p className="mb-3 font-ui text-xs font-semibold uppercase tracking-widest text-kelme-gray-400">
              En esta página
            </p>
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {HELP_QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block rounded-lg px-3 py-1.5 font-ui text-sm text-kelme-gray-600 transition-colors hover:bg-kelme-gray-100 hover:text-kelme-gray-900 lg:py-2"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-12">
            {HELP_SECTIONS.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-24 border-b border-kelme-border pb-12 last:border-b-0"
              >
                {section.eyebrow && (
                  <p className="font-ui text-xs font-semibold uppercase tracking-widest text-kelme-red">
                    {section.eyebrow}
                  </p>
                )}
                <h2 className="mt-1 font-display text-2xl font-bold text-kelme-gray-900">
                  {section.title}
                </h2>
                {section.intro && (
                  <p className="mt-3 font-body leading-relaxed text-kelme-gray-600">
                    {section.intro}
                  </p>
                )}
                <div className="mt-5 space-y-4">
                  {section.blocks.map((block, index) => (
                    <HelpBlockView key={`${section.id}-${index}`} block={block} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
