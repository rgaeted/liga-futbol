import { playerPositionBand } from '@/lib/formation-position-fit'
import { splitPersonName } from '@/lib/person-name'

export const PLAYER_CARD_MIN_PJ = 2
export const PLAYER_CARD_WINDOW_DAYS = 30
export const PLAYER_CARD_BASE_LIGA = 65
export const PLAYER_CARD_HOT_THRESHOLD = 85

export type PlayerCardPosition = 'DEL' | 'MED' | 'DEF' | 'POR'
export type PlayerCardEstado = 'completa' | 'en_formacion'
export type PlayerCardAtributos = {
  TIR: number | null
  VIS: number | null
  RES: number
  REG: number
  RIT: number
  FIS: number
}

const OVR_WEIGHTS: Record<PlayerCardPosition, Record<keyof PlayerCardAtributos, number>> = {
  DEL: { TIR: 0.34, VIS: 0.16, RES: 0.16, REG: 0.14, RIT: 0.12, FIS: 0.08 },
  MED: { TIR: 0.18, VIS: 0.3, RES: 0.16, REG: 0.16, RIT: 0.12, FIS: 0.08 },
  DEF: { TIR: 0.08, VIS: 0.16, RES: 0.22, REG: 0.14, RIT: 0.16, FIS: 0.24 },
  POR: { TIR: 0.04, VIS: 0.12, RES: 0.28, REG: 0.1, RIT: 0.1, FIS: 0.36 },
}

export function normalizar(
  valor: number,
  p10: number,
  p90: number,
  piso = 40,
  techo = 99,
): number {
  if (p90 <= p10) return Math.round((piso + techo) / 2)
  const t = Math.max(0, Math.min(1, (valor - p10) / (p90 - p10)))
  return Math.round(piso + t * (techo - piso))
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]!
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo)
}

export function cardPositionFromPlayer(
  primaryPosition: string | null | undefined,
  position: string | null | undefined,
): PlayerCardPosition {
  const band = playerPositionBand(primaryPosition) ?? playerPositionBand(position)
  if (band === 3) return 'DEL'
  if (band === 1) return 'DEF'
  if (band === 0) return 'POR'
  return 'MED'
}

export function playerCardShortName(nombre: string): string {
  const { firstName, lastName } = splitPersonName(nombre)
  if (!lastName) return firstName
  return `${firstName.charAt(0).toUpperCase()}. ${lastName}`
}

function fnv1a(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seedJitter(playerId: string, attr: 'REG' | 'RIT' | 'FIS'): number {
  return (fnv1a(`${playerId}:${attr}`) % 9) - 4
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export type CalcularCartaInput = {
  playerId: string
  primaryPosition?: string | null
  position?: string | null
  pj: number
  goles: number
  asistencias: number
  presencias: number
  fechasPosibles: number
  mvps: number
  rojas: number
  rachaGoleadora: number
  rachaPresencia: number
  p10GolesPorPartido: number
  p90GolesPorPartido: number
  p10AsistPorPartido: number
  p90AsistPorPartido: number
}

export type CalcularCartaResult = {
  posicion: PlayerCardPosition
  atributos: PlayerCardAtributos
  ovr: number | null
  estado: PlayerCardEstado
  partidosFaltantes: number
}

export function calcularCarta(input: CalcularCartaInput): CalcularCartaResult {
  const posicion = cardPositionFromPlayer(input.primaryPosition, input.position)
  const estado: PlayerCardEstado =
    input.pj >= PLAYER_CARD_MIN_PJ ? 'completa' : 'en_formacion'
  const partidosFaltantes = Math.max(0, PLAYER_CARD_MIN_PJ - input.pj)
  const gpp = input.pj > 0 ? input.goles / input.pj : 0
  const app = input.pj > 0 ? input.asistencias / input.pj : 0
  const tir = normalizar(gpp, input.p10GolesPorPartido, input.p90GolesPorPartido)
  const vis = normalizar(app, input.p10AsistPorPartido, input.p90AsistPorPartido)
  const res = Math.round(
    50 + (input.presencias / Math.max(1, input.fechasPosibles)) * 49,
  )
  const bonus =
    input.mvps * 2 +
    (input.rachaGoleadora >= 3 ? 3 : 0) +
    (input.rachaPresencia >= 5 ? 2 : 0) -
    input.rojas * 3
  const seedAttr = (attr: 'REG' | 'RIT' | 'FIS') =>
    clamp(PLAYER_CARD_BASE_LIGA + seedJitter(input.playerId, attr) + bonus, 40, 95)
  const atributos: PlayerCardAtributos = {
    TIR: estado === 'completa' ? tir : null,
    VIS: estado === 'completa' ? vis : null,
    RES: res,
    REG: seedAttr('REG'),
    RIT: seedAttr('RIT'),
    FIS: seedAttr('FIS'),
  }
  const ovr =
    estado === 'completa'
      ? Math.round(
          tir * OVR_WEIGHTS[posicion].TIR +
            vis * OVR_WEIGHTS[posicion].VIS +
            atributos.RES * OVR_WEIGHTS[posicion].RES +
            atributos.REG * OVR_WEIGHTS[posicion].REG +
            atributos.RIT * OVR_WEIGHTS[posicion].RIT +
            atributos.FIS * OVR_WEIGHTS[posicion].FIS,
        )
      : null
  return { posicion, atributos, ovr, estado, partidosFaltantes }
}
