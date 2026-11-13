import { KelmePawMark } from '@/components/marketing/KelmeCupBrush'
import { KELME_CUP } from '@/lib/org-brand'

export function KelmeCupInvite() {
  return (
    <section id="invitacion" className="relative scroll-mt-24 bg-[#f4f9ff] py-4 text-[#123a6b]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))] rounded-[24px] border border-[#1A7AE8]/20 bg-white p-6 shadow-[0_12px_32px_rgba(26,122,232,0.08)] sm:p-8">
        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="border-l-4 border-[#4b9deb] pl-3 text-[13px] font-extrabold uppercase tracking-[0.19em] text-[#1A7AE8]">Inscripciones abiertas</p>
            <p className="mt-3 font-display text-[clamp(30px,4vw,44px)] font-black uppercase italic leading-[0.95] tracking-[-0.02em] text-[#0B3D8F]">
              ¿Tu club o colegio se suma?
            </p>
            <p className="mt-2 text-sm text-[#2c4a73]">
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

      <p className="mx-auto mt-6 flex w-[min(1180px,calc(100%-32px))] items-center justify-end gap-2 font-display text-lg font-extrabold uppercase italic tracking-[0.04em] text-[#123a6b] sm:text-xl">
        ¡Nos vemos en la cancha!
        <KelmePawMark className="h-6 w-6 text-[#111]" />
        <span className="font-display text-sm font-bold uppercase tracking-[0.16em]">Kelme</span>
      </p>
    </section>
  )
}
