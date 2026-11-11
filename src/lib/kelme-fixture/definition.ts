import { scheduleInputToIso } from '@/lib/schedule-datetime'
import {
  GROUPS_CATEGORY,
  LEAGUE_CATEGORY,
  type CategoryCode,
  type FixturePhase,
  type FixtureSlot,
  type GroupCode,
} from './types'

export const FIXTURE_DATE = '2026-11-15'
export const FIXTURE_MATCH_MINUTES = 35

export type FixtureTeamDef = {
  key: string
  category: CategoryCode
  group: GroupCode | null
  name: string
  /** Nombres con los que podría existir ya en la base de datos (comparación sin tildes). */
  aliases: string[]
  provisional?: boolean
}

export const FIXTURE_TEAMS: FixtureTeamDef[] = [
  { key: 'g:ue', category: GROUPS_CATEGORY, group: 'A', name: 'Unión Española', aliases: ['Union Española PV', 'Union Espanola'] },
  { key: 'g:pmo', category: GROUPS_CATEGORY, group: 'A', name: 'Palestino Puerto Montt', aliases: ['Palestino'] },
  { key: 'g:nuevoA', category: GROUPS_CATEGORY, group: 'A', name: 'Equipo nuevo A', aliases: [], provisional: true },
  { key: 'g:21m', category: GROUPS_CATEGORY, group: 'B', name: '21 de Mayo', aliases: [] },
  { key: 'g:austral', category: GROUPS_CATEGORY, group: 'B', name: 'Academia Austral', aliases: [] },
  { key: 'g:nuevoB', category: GROUPS_CATEGORY, group: 'B', name: 'Equipo nuevo B', aliases: [], provisional: true },
  { key: 'l:ue', category: LEAGUE_CATEGORY, group: null, name: 'Unión Española', aliases: ['Union Española PV', 'Union Espanola'] },
  { key: 'l:21m', category: LEAGUE_CATEGORY, group: null, name: '21 de Mayo', aliases: [] },
  { key: 'l:pmo', category: LEAGUE_CATEGORY, group: null, name: 'Palestino Puerto Montt', aliases: ['Palestino'] },
  { key: 'l:amiguitos', category: LEAGUE_CATEGORY, group: null, name: 'Amiguitos', aliases: [] },
]

export type FixtureMatchDef = {
  code: string
  startTime: string
  court: number
  category: CategoryCode
  phase: FixturePhase
  group: GroupCode | null
  homeKey: string | null
  awayKey: string | null
  homeSlot: FixtureSlot | null
  awaySlot: FixtureSlot | null
}

function match(
  code: string,
  startTime: string,
  court: number,
  category: CategoryCode,
  phase: FixturePhase,
  group: GroupCode | null,
  home: string | FixtureSlot,
  away: string | FixtureSlot,
): FixtureMatchDef {
  return {
    code,
    startTime,
    court,
    category,
    phase,
    group,
    homeKey: typeof home === 'string' ? home : null,
    awayKey: typeof away === 'string' ? away : null,
    homeSlot: typeof home === 'string' ? null : home,
    awaySlot: typeof away === 'string' ? null : away,
  }
}

const CG: CategoryCode = GROUPS_CATEGORY
const CL: CategoryCode = LEAGUE_CATEGORY

export const FIXTURE_MATCHES: FixtureMatchDef[] = [
  match('M01', '09:00', 1, CG, 'GROUP', 'A', 'g:ue', 'g:pmo'),
  match('M02', '09:00', 2, CG, 'GROUP', 'B', 'g:21m', 'g:austral'),
  match('M03', '09:00', 3, CL, 'LEAGUE', null, 'l:ue', 'l:21m'),
  match('M04', '09:00', 4, CL, 'LEAGUE', null, 'l:pmo', 'l:amiguitos'),
  match('M05', '09:45', 1, CG, 'GROUP', 'A', 'g:ue', 'g:nuevoA'),
  match('M06', '09:45', 2, CG, 'GROUP', 'B', 'g:21m', 'g:nuevoB'),
  match('M07', '09:45', 3, CL, 'LEAGUE', null, 'l:ue', 'l:pmo'),
  match('M08', '09:45', 4, CL, 'LEAGUE', null, 'l:21m', 'l:amiguitos'),
  match('M09', '10:30', 1, CG, 'GROUP', 'A', 'g:pmo', 'g:nuevoA'),
  match('M10', '10:30', 2, CG, 'GROUP', 'B', 'g:austral', 'g:nuevoB'),
  match('M11', '10:30', 3, CL, 'LEAGUE', null, 'l:ue', 'l:amiguitos'),
  match('M12', '10:30', 4, CL, 'LEAGUE', null, 'l:21m', 'l:pmo'),
  match('M13', '11:15', 1, CG, 'FINAL', null, { group: 'A', rank: 1 }, { group: 'B', rank: 1 }),
  match('M14', '11:15', 2, CG, 'THIRD_PLACE', null, { group: 'A', rank: 2 }, { group: 'B', rank: 2 }),
  match('M15', '11:15', 3, CG, 'FIFTH_PLACE', null, { group: 'A', rank: 3 }, { group: 'B', rank: 3 }),
]

export function fixtureStartAt(def: Pick<FixtureMatchDef, 'startTime'>): Date {
  return new Date(scheduleInputToIso(FIXTURE_DATE, def.startTime))
}

export function fixtureEndAt(startAt: Date): Date {
  return new Date(startAt.getTime() + FIXTURE_MATCH_MINUTES * 60_000)
}

export const PHASE_LABELS: Record<FixturePhase, string> = {
  GROUP: 'Fase de grupos',
  LEAGUE: 'Liga',
  FINAL: 'Final',
  THIRD_PLACE: 'Tercer puesto',
  FIFTH_PLACE: 'Quinto puesto',
}

export function slotLabel(slot: FixtureSlot): string {
  return `${slot.rank}.º Grupo ${slot.group}`
}

export function normalizeTeamName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function serializeSlot(slot: FixtureSlot): string {
  return `${slot.group}:${slot.rank}`
}

export function parseSlot(value: string | null): FixtureSlot | null {
  if (!value) return null
  const [group, rank] = value.split(':')
  if ((group !== 'A' && group !== 'B') || !['1', '2', '3'].includes(rank)) return null
  return { group, rank: Number(rank) as 1 | 2 | 3 }
}
