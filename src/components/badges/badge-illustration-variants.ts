/** Variante visual de la ilustración moderna por iconKey. */
export type BadgeIllustrationVariant =
  | 'clock_ball'
  | 'hero_shield'
  | 'two_balls'
  | 'three_balls_stars'
  | 'goal_net'
  | 'gloves_cold'
  | 'single_ball_motion'
  | 'four_balls'
  | 'star_burst'
  | 'wall_shield'
  | 'gloves_save'
  | 'chart_rise'
  | 'linked_nodes'
  | 'boot_pass'
  | 'calendar_check'
  | 'rain_boot'
  | 'yellow_card'
  | 'autogoal'
  | 'medal_club'
  | 'number_fifty'
  | 'first_arrow'
  | 'comeback_hand'
  | 'fire_streak'
  | 'generic_shield'

export const BADGE_ILLUSTRATION_VARIANT: Record<string, BadgeIllustrationVariant> =
  {
    gol_ultima_hora: 'clock_ball',
    heroe_remontada: 'hero_shield',
    doblete_express: 'two_balls',
    hat_trick: 'three_balls_stars',
    abrio_la_lata: 'goal_net',
    mano_helada: 'gloves_cold',
    el_ultimo_en_rendirse: 'comeback_hand',
    poker: 'four_balls',
    sentencio: 'single_ball_motion',
    verdugo: 'three_balls_stars',
    de_todos_los_sabores: 'boot_pass',
    arquitecto: 'chart_rise',
    sociedad: 'linked_nodes',
    taco_de_oro: 'boot_pass',
    bandeja_de_plata: 'chart_rise',
    valla_invicta: 'wall_shield',
    muro: 'wall_shield',
    salvador: 'gloves_save',
    pichanga_limpia: 'wall_shield',
    nunca_falla: 'calendar_check',
    puntual: 'calendar_check',
    todoterreno: 'calendar_check',
    el_fundador: 'medal_club',
    sin_excusas: 'rain_boot',
    en_contra: 'autogoal',
    caballero: 'wall_shield',
    tarjetero: 'yellow_card',
    el_show: 'star_burst',
    bombero: 'fire_streak',
    club_50: 'number_fifty',
    centurion_asist: 'number_fifty',
    kilometrero: 'medal_club',
    mano_a_mano: 'linked_nodes',
    primer_gol: 'first_arrow',
  }

export function badgeIllustrationVariant(iconKey: string): BadgeIllustrationVariant {
  return BADGE_ILLUSTRATION_VARIANT[iconKey] ?? 'generic_shield'
}
