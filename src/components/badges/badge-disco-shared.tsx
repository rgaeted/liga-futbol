import type { ReactNode } from 'react'

export type BadgeDiscoSize = 'sm' | 'md' | 'lg'

export const SIZE_CLASSES: Record<BadgeDiscoSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-[72px] w-[72px]',
  lg: 'h-20 w-20',
}

export const ICON_SVG: Record<string, ReactNode> = {
  gol_ultima_hora: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2" />
      <path d="M12 3h0" />
      <path d="M9 3h6" />
    </>
  ),
  heroe_remontada: (
    <>
      <path d="M4 14l4-4 4 3 6-7" />
      <path d="M18 6h2v2" />
      <path d="M4 19h16" />
    </>
  ),
  mano_helada: (
    <>
      <path d="M12 3v4" />
      <circle cx="12" cy="14" r="6" />
      <path d="M9.5 14l1.8 1.8 3.2-3.4" />
    </>
  ),
  doblete_express: (
    <>
      <circle cx="8" cy="12" r="4" />
      <circle cx="17" cy="12" r="4" />
      <path d="M12 6v12" />
    </>
  ),
  hat_trick: (
    <>
      <circle cx="6" cy="15" r="3" />
      <circle cx="12" cy="15" r="3" />
      <circle cx="18" cy="15" r="3" />
      <path d="M4 9l2 3M12 8v4M20 9l-2 3" />
    </>
  ),
  poker: <path d="M12 2l2.4 5 5.6.6-4 4 1 5.4L12 19l-5 3 1-5.4-4-4 5.6-.6z" />,
  abrio_la_lata: (
    <>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </>
  ),
  de_todos_los_sabores: (
    <>
      <path d="M12 3v18" />
      <path d="M7 7l5-4 5 4" />
      <path d="M7 12l5-4 5 4" />
    </>
  ),
  arquitecto: <path d="M4 18L10 6l4 8 2-4 4 8" />,
  sociedad: (
    <>
      <circle cx="7" cy="9" r="3" />
      <circle cx="17" cy="15" r="3" />
      <path d="M9.5 10.5l5 3" />
    </>
  ),
  taco_de_oro: (
    <>
      <path d="M12 3v6M9 6h6" />
      <circle cx="12" cy="15" r="5" />
      <path d="M10 15l1.5 1.5 3-3" />
    </>
  ),
  bandeja_de_plata: (
    <>
      <path d="M4 16l8-8 4 4 4-4" />
      <circle cx="4" cy="16" r="1.5" />
    </>
  ),
  mano_a_mano: (
    <>
      <path d="M4 16l8-8 4 4 4-4" />
      <circle cx="4" cy="16" r="1.5" />
    </>
  ),
  valla_invicta: <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />,
  muro: (
    <>
      <rect x="4" y="8" width="16" height="12" />
      <path d="M4 12h16M9 8v12M15 8v12" />
    </>
  ),
  salvador: (
    <>
      <path d="M6 20V10a6 6 0 0112 0v10" />
      <path d="M9 20v-4M15 20v-4" />
      <circle cx="12" cy="9" r="1.5" />
    </>
  ),
  pichanga_limpia: (
    <>
      <path d="M12 4l6 2.5V11c0 4-2.6 6.5-6 8-3.4-1.5-6-4-6-8V6.5z" />
      <path d="M9.5 11l1.8 1.8 3.2-3.3" />
    </>
  ),
  nunca_falla: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  el_fundador: (
    <path d="M12 3l2 5 5 .5-4 3.5 1.2 5L12 19l-4.2 3 1.2-5-4-3.5 5-.5z" />
  ),
  puntual: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  sin_excusas: (
    <>
      <path d="M4 14a8 8 0 0116 0" />
      <path d="M4 14h16M8 19h8" />
      <path d="M12 6V3" />
    </>
  ),
  en_contra: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 15l6-6M9 9l6 6" />
    </>
  ),
  caballero: (
    <>
      <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
      <path d="M9.5 11.5l1.8 1.8 3.2-3.3" />
    </>
  ),
  el_show: (
    <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />
  ),
  bombero: (
    <>
      <path d="M5 18v-6a7 7 0 0114 0v6" />
      <path d="M5 18h14" />
      <path d="M12 5V3" />
    </>
  ),
  club_50: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M8.5 9.5h5a2 2 0 010 4h-4" />
    </>
  ),
  primer_gol: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M9 11l3-3 3 3" />
    </>
  ),
}

export function discoBackClasses(rarity: string, locked: boolean): string {
  if (locked) {
    return 'border border-[#333] bg-[radial-gradient(circle_at_50%_50%,rgba(85,85,85,0.1),#111)] text-[#555]'
  }

  switch (rarity) {
    case 'raro':
      return 'border border-[#1A7A4E] bg-[radial-gradient(circle_at_50%_50%,rgba(61,230,140,0.12),#0E1813)] text-[#2FA66A]'
    case 'epico':
      return 'border border-[#B85A20] bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,26,0.14),#12100C)] text-[#FF6B1A]'
    case 'legendario':
      return 'border border-[#B89448] bg-[radial-gradient(circle_at_50%_50%,rgba(232,200,120,0.22),#15110C)] text-[#E8C878]'
    default:
      return 'border border-[#444] bg-[radial-gradient(circle_at_50%_50%,rgba(139,165,152,0.12),#141414)] text-[#8BA598]'
  }
}

export function discoClasses(rarity: string, locked: boolean): string {
  if (locked) {
    return 'border border-[#444] bg-[radial-gradient(circle_at_50%_35%,rgba(85,85,85,0.15),#111)] text-[#555]'
  }

  switch (rarity) {
    case 'raro':
      return 'border border-[#1FA968] bg-[radial-gradient(circle_at_50%_35%,rgba(61,230,140,0.25),#12241B)] text-[#3DE68C] shadow-[0_0_16px_rgba(61,230,140,0.08)]'
    case 'epico':
      return 'border border-[#FF6B1A] bg-[radial-gradient(circle_at_50%_35%,rgba(255,107,26,0.28),#1B120C)] text-[#FF6B1A] shadow-[0_0_16px_rgba(255,107,26,0.15)]'
    case 'legendario':
      return 'border border-[#E8C878] bg-[radial-gradient(circle_at_50%_30%,rgba(255,243,208,0.4),rgba(232,200,120,0.15)_55%,#1B1710)] text-[#E8C878] shadow-[0_0_22px_rgba(232,200,120,0.35)]'
    default:
      return 'border border-[#8BA598] bg-[radial-gradient(circle_at_50%_35%,rgba(139,165,152,0.18),#141414)] text-[#8BA598]'
  }
}

const BADGE_CARD_BASE =
  'border border-white/[0.08] bg-gradient-to-b from-[#1A1A1A] to-[#0C0C0C] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'

export function badgeCardClasses(rarity: string, locked: boolean, proximamente: boolean): string {
  if (locked) return `${BADGE_CARD_BASE} opacity-45 saturate-50`
  if (proximamente) return `${BADGE_CARD_BASE} opacity-70`

  switch (rarity) {
    case 'raro':
      return `${BADGE_CARD_BASE} shadow-[0_0_18px_rgba(61,230,140,0.08)]`
    case 'epico':
      return `${BADGE_CARD_BASE} shadow-[0_0_22px_rgba(255,107,26,0.14)]`
    case 'legendario':
      return `${BADGE_CARD_BASE} border-[#FF6B1A]/35 shadow-[0_0_26px_rgba(255,107,26,0.22)]`
    default:
      return BADGE_CARD_BASE
  }
}

export function badgeRarityLabel(rarity: string): string {
  switch (rarity) {
    case 'raro':
      return 'Raro'
    case 'epico':
      return 'Épico'
    case 'legendario':
      return 'Legendario'
    default:
      return 'Común'
  }
}

/** Acento visual por rareza (leyenda vitrina + aro de medalla). */
export function badgeRarityAccent(rarity: string, locked: boolean): string {
  if (locked) return '#555555'

  switch (rarity) {
    case 'raro':
      return '#3DE68C'
    case 'epico':
      return '#FF6B1A'
    case 'legendario':
      return '#E8C878'
    default:
      return '#8BA598'
  }
}
