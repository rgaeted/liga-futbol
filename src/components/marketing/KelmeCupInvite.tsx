import { KelmePawMark } from '@/components/marketing/KelmeCupBrush'

export function KelmeCupInvite() {
  return (
    <section id="invitacion" className="relative scroll-mt-24 bg-[#f4f9ff] py-4 text-[#123a6b]">
      <p className="mx-auto flex w-[min(1180px,calc(100%-32px))] items-center justify-end gap-2 font-display text-lg font-extrabold uppercase italic tracking-[0.04em] text-[#123a6b] sm:text-xl">
        ¡Nos vemos en la cancha!
        <KelmePawMark className="h-6 w-6 text-[#111]" />
        <span className="font-display text-sm font-bold uppercase tracking-[0.16em]">Kelme</span>
      </p>
    </section>
  )
}
