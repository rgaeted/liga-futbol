import { KelmePawMark } from '@/components/marketing/KelmeCupBrush'
import { KELME_CUP, KELME_CUP_PITCH_PATH } from '@/lib/org-brand'

const FACTS = [
  { icon: '📅', label: 'Fecha', value: KELME_CUP.dateLabel },
  { icon: '📍', label: 'Cancha', value: KELME_CUP.venue },
  { icon: '⏰', label: 'Horario', value: KELME_CUP.timeLabel },
] as const

const FORMAT = [
  { value: '2', label: 'Categorías', hint: 'Según año de nacimiento' },
  { value: '7 vs 7', label: 'Jugadores por lado', hint: 'Fútbol 7 infantil' },
  { value: '4', label: 'Equipos por categoría', hint: 'Cupos limitados' },
  { value: '∞', label: 'Cambios ilimitados', hint: 'Para que jueguen todos' },
] as const

export function KelmeCupInvite() {
  return (
    <section id="invitacion" className="relative scroll-mt-24 bg-[#f4f9ff] py-4 text-[#123a6b]">
      <div className="mx-auto grid w-[min(1180px,calc(100%-32px))] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[24px] border border-[#1A7AE8]/20 bg-white p-6 shadow-[0_12px_32px_rgba(26,122,232,0.08)] sm:p-8">
          <h2 className="font-display text-[22px] font-bold uppercase tracking-[0.08em] text-[#0B3D8F] sm:text-[26px]">
            Datos clave
          </h2>
          <ul className="mt-5 space-y-4">
            {FACTS.map((fact) => (
              <li key={fact.label} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f2ff] text-lg">
                  {fact.icon}
                </span>
                <div>
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-[#1A7AE8]">
                    {fact.label}
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-[#123a6b]">{fact.value}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <div className="overflow-hidden rounded-[24px] border border-[#1A7AE8]/20 shadow-[0_12px_32px_rgba(26,122,232,0.08)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={KELME_CUP_PITCH_PATH}
            alt="Canchas Colegio Puerto Varas"
            className="h-full min-h-[220px] w-full object-cover"
          />
        </div>
      </div>

      <div className="mx-auto mt-6 w-[min(1180px,calc(100%-32px))] rounded-[24px] border border-[#1A7AE8]/20 bg-white p-6 shadow-[0_12px_32px_rgba(26,122,232,0.08)] sm:p-8">
        <h2 className="font-display text-[22px] font-bold uppercase tracking-[0.08em] text-[#0B3D8F] sm:text-[26px]">
          Formato de competencia
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FORMAT.map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#eef6ff] px-4 py-5 text-center">
              <p className="font-display text-[clamp(28px,5vw,40px)] font-bold leading-none text-[#1A7AE8]">
                {item.value}
              </p>
              <p className="mt-2 font-display text-[12px] font-bold uppercase tracking-[0.1em] text-[#123a6b]">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-[#4d6790]">{item.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 border-t border-[#1A7AE8]/15 pt-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="font-script text-2xl font-semibold text-[#1A7AE8] sm:text-[28px]">
              ¿Tu club o colegio se suma?
            </p>
            <p className="mt-1 text-sm text-[#2c4a73]">
              Cupos limitados por categoría — confirma tu equipo a la brevedad.
            </p>
            <p className="mt-3 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-[#0B3D8F]">
              Cierre de inscripciones · {KELME_CUP.signupClose}
            </p>
          </div>
          <div className="rounded-2xl bg-[#0B3D8F] px-5 py-4 text-white">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
              Contacto e inscripciones
            </p>
            <p className="mt-2 font-display text-lg font-bold uppercase tracking-wide">
              {KELME_CUP.contactName}
            </p>
            <a
              href={KELME_CUP.whatsappHref}
              className="mt-2 block text-sm font-semibold text-white hover:underline"
            >
              WhatsApp {KELME_CUP.whatsappDisplay}
            </a>
            <a
              href={`mailto:${KELME_CUP.email}`}
              className="mt-1 block text-sm text-white/85 hover:underline"
            >
              {KELME_CUP.email}
            </a>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 flex w-[min(1180px,calc(100%-32px))] items-center justify-end gap-2 font-script text-xl text-[#123a6b] sm:text-2xl">
        ¡Nos vemos en la cancha!
        <KelmePawMark className="h-6 w-6 text-[#111]" />
        <span className="font-display text-sm font-bold uppercase tracking-[0.16em]">Kelme</span>
      </p>
    </section>
  )
}
