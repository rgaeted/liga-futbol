import { MatchDecidedBy, MatchStatus, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { teamCrestUrl } from '@/lib/team-crest'
import { parseSlot, slotLabel } from './definition'
import { planDefinitions, type DefinitionState } from './definitions'
import { recalculateFixture } from './engine'
import {
  GROUPS_CATEGORY,
  LEAGUE_CATEGORY,
  isDefinitionPhase,
  type TableKey,
  type CategoryCode,
  type DefinitionDrawPolicy,
  type FixtureConfig,
  type FixtureStatus,
  type GroupCode,
} from './types'
import { validateResult } from './validation'
import { buildFixtureView, type FixtureSnapshot, type FixtureView } from './view'

type Tx = Prisma.TransactionClient

export class FixtureError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message)
    this.name = 'FixtureError'
  }
}

const STATUS_FROM_DB: Record<MatchStatus, FixtureStatus> = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'IN_PROGRESS',
  HALFTIME: 'IN_PROGRESS',
  FINISHED: 'FINAL',
  CANCELLED: 'CANCELLED',
}

const STATUS_TO_DB: Record<FixtureStatus, MatchStatus> = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'LIVE',
  FINAL: 'FINISHED',
  CANCELLED: 'CANCELLED',
}

export function categoryCodeFromName(name: string): CategoryCode | null {
  if (name.includes('2019')) return '2019-2018'
  if (name.includes('2017')) return '2017-2016'
  return null
}

function parseConfig(raw: Prisma.JsonValue | null): FixtureConfig {
  const value = (raw ?? {}) as Partial<FixtureConfig>
  return {
    definitionDrawPolicy:
      value.definitionDrawPolicy === 'DRAW_ALLOWED' ? 'DRAW_ALLOWED' : 'PENALTIES_REQUIRED',
    manualRanking: value.manualRanking ?? {},
  }
}

/** Temporada que contiene el fixture automático de la organización (la más reciente). */
export async function findFixtureSeasonId(organizationId: string, client: Tx = db): Promise<string | null> {
  const match = await client.match.findFirst({
    where: { organizationId, fixtureCode: { not: null }, seasonId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { seasonId: true },
  })
  return match?.seasonId ?? null
}

export async function loadFixtureSnapshot(seasonId: string, client: Tx = db): Promise<FixtureSnapshot> {
  const season = await client.season.findUnique({
    where: { id: seasonId },
    select: { id: true, name: true, fixtureConfig: true },
  })
  if (!season) throw new FixtureError('Temporada no encontrada.', 404)

  const [seasonTeams, rows] = await Promise.all([
    client.seasonTeam.findMany({
      where: { seasonId },
      orderBy: { sortOrder: 'asc' },
      include: {
        team: { select: { id: true, name: true, color: true, crestMimeType: true, updatedAt: true } },
        seasonCategory: { select: { category: { select: { name: true } } } },
      },
    }),
    client.match.findMany({
      where: { seasonId, fixtureCode: { not: null }, phase: { not: null } },
      include: { seasonCategory: { select: { category: { select: { name: true } } } } },
    }),
  ])

  const teams: FixtureSnapshot['teams'] = []
  for (const st of seasonTeams) {
    const category = st.seasonCategory ? categoryCodeFromName(st.seasonCategory.category.name) : null
    if (!category) continue
    const group = st.groupCode === 'A' || st.groupCode === 'B' ? (st.groupCode as GroupCode) : null
    teams.push({
      id: st.team.id,
      name: (st.team.name || st.displayName || '').trim(),
      category,
      group,
      sortOrder: st.sortOrder,
      color: st.color ?? st.team.color,
      crestUrl: st.team.crestMimeType ? teamCrestUrl(st.team.id, st.team.updatedAt) : null,
    })
  }

  const matches: FixtureSnapshot['matches'] = []
  for (const row of rows) {
    const category = row.seasonCategory ? categoryCodeFromName(row.seasonCategory.category.name) : null
    if (!category || !row.phase || !row.fixtureCode) continue
    matches.push({
      id: row.id,
      code: row.fixtureCode,
      category,
      phase: row.phase,
      group: row.groupCode === 'A' || row.groupCode === 'B' ? (row.groupCode as GroupCode) : null,
      court: row.court ?? 0,
      startAt: row.scheduledAt,
      endAt: row.endsAt ?? new Date(row.scheduledAt.getTime() + 35 * 60_000),
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeSlot: parseSlot(row.homeSlot),
      awaySlot: parseSlot(row.awaySlot),
      homeGoals: row.homeScore,
      awayGoals: row.awayScore,
      status: STATUS_FROM_DB[row.status],
      decidedBy: row.decidedBy,
      penaltyHome: row.penaltyHome,
      penaltyAway: row.penaltyAway,
      updatedAt: row.updatedAt,
    })
  }

  return {
    seasonId: season.id,
    seasonName: season.name,
    config: parseConfig(season.fixtureConfig),
    teams,
    matches,
  }
}

export async function getFixtureView(seasonId: string, client: Tx = db): Promise<FixtureView> {
  return buildFixtureView(await loadFixtureSnapshot(seasonId, client))
}

type AuditInput = {
  organizationId: string
  seasonId: string
  matchId?: string | null
  userId?: string | null
  action: 'RESULT' | 'AUTO_ASSIGN' | 'FORCE_ASSIGN' | 'RANKING' | 'CONFIG' | 'TEAM_RENAME'
  reason?: string | null
  before?: Prisma.InputJsonValue
  after?: Prisma.InputJsonValue
}

async function writeAudit(tx: Tx, input: AuditInput) {
  await tx.fixtureAuditLog.create({
    data: {
      organizationId: input.organizationId,
      seasonId: input.seasonId,
      matchId: input.matchId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      reason: input.reason?.trim() || null,
      before: input.before,
      after: input.after,
    },
  })
}

async function applyAssignments(
  tx: Tx,
  ctx: { organizationId: string; seasonId: string; userId: string | null },
  snapshot: FixtureSnapshot,
  assignments: Array<{ code: string; homeTeamId: string | null; awayTeamId: string | null }>,
  action: 'AUTO_ASSIGN' | 'FORCE_ASSIGN',
  reason?: string,
) {
  for (const assignment of assignments) {
    const match = snapshot.matches.find((m) => m.code === assignment.code)
    if (!match) continue
    await tx.match.update({
      where: { id: match.id },
      data: {
        homeTeamId: assignment.homeTeamId,
        awayTeamId: assignment.awayTeamId,
        sideAName: assignment.homeTeamId || !match.homeSlot ? null : `Por definir (${slotLabel(match.homeSlot)})`,
        sideBName: assignment.awayTeamId || !match.awaySlot ? null : `Por definir (${slotLabel(match.awaySlot)})`,
      },
    })
    await writeAudit(tx, {
      ...ctx,
      matchId: match.id,
      action,
      reason,
      before: { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
      after: { homeTeamId: assignment.homeTeamId, awayTeamId: assignment.awayTeamId },
    })
  }
}

/** Recalcula y asigna los cruces M13–M15 de forma idempotente (solo actualiza partidos existentes). */
async function syncDefinitions(
  tx: Tx,
  ctx: { organizationId: string; seasonId: string; userId: string | null },
): Promise<FixtureSnapshot> {
  const snapshot = await loadFixtureSnapshot(ctx.seasonId, tx)
  const { plan } = recalculateFixture({
    teams: snapshot.teams,
    matches: snapshot.matches,
    config: snapshot.config,
  })
  if (plan.assignments.length === 0) return snapshot
  await applyAssignments(tx, ctx, snapshot, plan.assignments, 'AUTO_ASSIGN')
  return loadFixtureSnapshot(ctx.seasonId, tx)
}

async function runSerializable<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new FixtureError(
        'Otra persona modificó el fixture al mismo tiempo. Recarga la página e inténtalo otra vez.',
        409,
      )
    }
    throw error
  }
}

export type SaveResultInput = {
  organizationId: string
  seasonId: string
  matchId: string
  userId: string | null
  status: FixtureStatus
  homeGoals: number | null
  awayGoals: number | null
  penaltyHome?: number | null
  penaltyAway?: number | null
  confirmFinal?: boolean
  reason?: string
  /** `updatedAt` del partido que vio quien edita; evita pisar cambios simultáneos. */
  expectedUpdatedAt?: string
}

export async function saveMatchResult(input: SaveResultInput): Promise<FixtureView> {
  return runSerializable(async (tx) => {
    const ctx = { organizationId: input.organizationId, seasonId: input.seasonId, userId: input.userId }
    const snapshot = await loadFixtureSnapshot(input.seasonId, tx)
    const match = snapshot.matches.find((m) => m.id === input.matchId)
    if (!match) throw new FixtureError('Partido no encontrado.', 404)

    if (input.expectedUpdatedAt && new Date(input.expectedUpdatedAt).getTime() !== match.updatedAt.getTime()) {
      throw new FixtureError(
        'Este partido fue modificado por otra persona. Recarga la página para ver los cambios.',
        409,
      )
    }

    const validation = validateResult({
      phase: match.phase,
      status: input.status,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeGoals: input.homeGoals,
      awayGoals: input.awayGoals,
      penaltyHome: input.penaltyHome,
      penaltyAway: input.penaltyAway,
      confirmFinal: input.confirmFinal,
      drawPolicy: snapshot.config.definitionDrawPolicy,
    })
    if (!validation.ok) throw new FixtureError(validation.error, 422)
    const next = validation.value

    const unchanged =
      next.status === match.status &&
      next.homeGoals === match.homeGoals &&
      next.awayGoals === match.awayGoals &&
      next.penaltyHome === match.penaltyHome &&
      next.penaltyAway === match.penaltyAway
    if (unchanged) return buildFixtureView(snapshot)

    const wasFinal = match.status === 'FINAL'
    if (wasFinal && !input.reason?.trim()) {
      throw new FixtureError('Indica el motivo de la corrección de un resultado ya cerrado.', 422)
    }

    await tx.match.update({
      where: { id: match.id },
      data: {
        status: STATUS_TO_DB[next.status],
        homeScore: next.homeGoals,
        awayScore: next.awayGoals,
        penaltyHome: next.penaltyHome,
        penaltyAway: next.penaltyAway,
        decidedBy: next.decidedBy as MatchDecidedBy | null,
      },
    })
    await writeAudit(tx, {
      ...ctx,
      matchId: match.id,
      action: 'RESULT',
      reason: input.reason,
      before: {
        status: match.status,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        penaltyHome: match.penaltyHome,
        penaltyAway: match.penaltyAway,
      },
      after: {
        status: next.status,
        homeGoals: next.homeGoals,
        awayGoals: next.awayGoals,
        penaltyHome: next.penaltyHome,
        penaltyAway: next.penaltyAway,
      },
    })

    return buildFixtureView(await syncDefinitions(tx, ctx))
  })
}

const TABLE_KEYS = ['A', 'B', 'LEAGUE'] as const
export type { TableKey }

export function isTableKey(value: string): value is TableKey {
  return (TABLE_KEYS as readonly string[]).includes(value)
}

/** Guarda el orden manual aprobado para romper un empate irresoluble. */
export async function saveManualRanking(input: {
  organizationId: string
  seasonId: string
  userId: string | null
  table: TableKey
  teamIds: string[]
  reason: string
}): Promise<FixtureView> {
  if (!input.reason.trim()) throw new FixtureError('Indica el motivo del desempate.', 422)

  return runSerializable(async (tx) => {
    const ctx = { organizationId: input.organizationId, seasonId: input.seasonId, userId: input.userId }
    const snapshot = await loadFixtureSnapshot(input.seasonId, tx)

    const tableTeamIds = snapshot.teams
      .filter((team) =>
        input.table === 'LEAGUE'
          ? team.category === LEAGUE_CATEGORY
          : team.category === GROUPS_CATEGORY && team.group === input.table,
      )
      .map((team) => team.id)
    const unique = new Set(input.teamIds)
    if (unique.size !== input.teamIds.length || input.teamIds.some((id) => !tableTeamIds.includes(id))) {
      throw new FixtureError('El orden incluye equipos que no pertenecen a esta tabla.', 422)
    }

    const state = recalculateFixture({ teams: snapshot.teams, matches: snapshot.matches, config: snapshot.config })
    const standings =
      input.table === 'A' ? state.standings.A : input.table === 'B' ? state.standings.B : state.standings.league
    const missing = standings.unresolvedTeamIds.filter((id) => !unique.has(id))
    if (missing.length > 0) {
      throw new FixtureError('El orden debe incluir a todos los equipos empatados.', 422)
    }

    const config: FixtureConfig = {
      ...snapshot.config,
      manualRanking: {
        ...snapshot.config.manualRanking,
        [input.table]: { teamIds: input.teamIds, reason: input.reason.trim() },
      },
    }
    await tx.season.update({
      where: { id: input.seasonId },
      data: { fixtureConfig: config as unknown as Prisma.InputJsonValue },
    })
    await writeAudit(tx, {
      ...ctx,
      action: 'RANKING',
      reason: input.reason,
      before: (snapshot.config.manualRanking[input.table] ?? null) as Prisma.InputJsonValue,
      after: { table: input.table, teamIds: input.teamIds },
    })

    return buildFixtureView(await syncDefinitions(tx, ctx))
  })
}

export async function clearManualRanking(input: {
  organizationId: string
  seasonId: string
  userId: string | null
  table: TableKey
  reason: string
}): Promise<FixtureView> {
  if (!input.reason.trim()) throw new FixtureError('Indica el motivo.', 422)
  return runSerializable(async (tx) => {
    const ctx = { organizationId: input.organizationId, seasonId: input.seasonId, userId: input.userId }
    const snapshot = await loadFixtureSnapshot(input.seasonId, tx)
    const { [input.table]: previous, ...rest } = snapshot.config.manualRanking
    await tx.season.update({
      where: { id: input.seasonId },
      data: { fixtureConfig: { ...snapshot.config, manualRanking: rest } as unknown as Prisma.InputJsonValue },
    })
    await writeAudit(tx, {
      ...ctx,
      action: 'RANKING',
      reason: input.reason,
      before: (previous ?? null) as Prisma.InputJsonValue,
      after: { table: input.table, teamIds: null },
    })
    return buildFixtureView(await syncDefinitions(tx, ctx))
  })
}

export async function saveDrawPolicy(input: {
  organizationId: string
  seasonId: string
  userId: string | null
  policy: DefinitionDrawPolicy
}): Promise<FixtureView> {
  return runSerializable(async (tx) => {
    const ctx = { organizationId: input.organizationId, seasonId: input.seasonId, userId: input.userId }
    const snapshot = await loadFixtureSnapshot(input.seasonId, tx)
    if (snapshot.config.definitionDrawPolicy === input.policy) return buildFixtureView(snapshot)
    await tx.season.update({
      where: { id: input.seasonId },
      data: { fixtureConfig: { ...snapshot.config, definitionDrawPolicy: input.policy } as unknown as Prisma.InputJsonValue },
    })
    await writeAudit(tx, {
      ...ctx,
      action: 'CONFIG',
      before: { definitionDrawPolicy: snapshot.config.definitionDrawPolicy },
      after: { definitionDrawPolicy: input.policy },
    })
    return getFixtureView(input.seasonId, tx)
  })
}

/**
 * Corrige el cuadro de definiciones después de que comenzaron. Es explícito, exige motivo y queda
 * auditado: reasigna M13–M15 según las posiciones actuales de los grupos.
 */
export async function forceReassignDefinitions(input: {
  organizationId: string
  seasonId: string
  userId: string | null
  reason: string
}): Promise<FixtureView> {
  if (!input.reason.trim()) throw new FixtureError('Indica el motivo de la corrección del cuadro.', 422)
  return runSerializable(async (tx) => {
    const ctx = { organizationId: input.organizationId, seasonId: input.seasonId, userId: input.userId }
    const snapshot = await loadFixtureSnapshot(input.seasonId, tx)
    const state = recalculateFixture({ teams: snapshot.teams, matches: snapshot.matches, config: snapshot.config })

    const definitions: DefinitionState[] = snapshot.matches
      .filter((m) => isDefinitionPhase(m.phase) && m.homeSlot && m.awaySlot)
      .map((m) => ({
        code: m.code,
        phase: m.phase,
        status: 'SCHEDULED' as FixtureStatus,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeSlot: m.homeSlot!,
        awaySlot: m.awaySlot!,
      }))
    const plan = planDefinitions({
      standingsA: state.standings.A,
      standingsB: state.standings.B,
      definitions,
    })
    await applyAssignments(tx, ctx, snapshot, plan.assignments, 'FORCE_ASSIGN', input.reason)
    return getFixtureView(input.seasonId, tx)
  })
}

export async function renameFixtureTeam(input: {
  organizationId: string
  seasonId: string
  userId: string | null
  teamId: string
  name: string
}): Promise<FixtureView> {
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 60) {
    throw new FixtureError('El nombre debe tener entre 2 y 60 caracteres.', 422)
  }
  return runSerializable(async (tx) => {
    const ctx = { organizationId: input.organizationId, seasonId: input.seasonId, userId: input.userId }
    const seasonTeam = await tx.seasonTeam.findFirst({
      where: { seasonId: input.seasonId, teamId: input.teamId, team: { organizationId: input.organizationId } },
      select: { id: true, displayName: true, team: { select: { name: true } } },
    })
    if (!seasonTeam) throw new FixtureError('Equipo no encontrado en esta temporada.', 404)

    await tx.team.update({ where: { id: input.teamId }, data: { name } })
    await tx.seasonTeam.update({ where: { id: seasonTeam.id }, data: { displayName: name } })
    await writeAudit(tx, {
      ...ctx,
      action: 'TEAM_RENAME',
      before: { name: seasonTeam.displayName || seasonTeam.team.name },
      after: { name },
    })
    return getFixtureView(input.seasonId, tx)
  })
}

/**
 * Fixture para la landing pública. Es tolerante a fallos: si la base aún no tiene la migración
 * del fixture o no hay partidos cargados, devuelve `null` y la landing sigue funcionando.
 */
export async function getPublicFixtureView(organizationSlug: string): Promise<FixtureView | null> {
  try {
    const org = await db.organization.findFirst({
      where: { slug: organizationSlug, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!org) return null
    const seasonId = await findFixtureSeasonId(org.id)
    if (!seasonId) return null
    return await getFixtureView(seasonId)
  } catch (error) {
    console.warn('[kelme-fixture] no se pudo cargar el fixture público', error)
    return null
  }
}

export async function listFixtureAudit(seasonId: string, limit = 40) {
  const logs = await db.fixtureAuditLog.findMany({
    where: { seasonId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  const userIds = [...new Set(logs.map((log) => log.userId).filter((id): id is string => !!id))]
  const users = userIds.length
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : []
  const userNames = new Map(users.map((user) => [user.id, user.name]))
  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    reason: log.reason,
    matchId: log.matchId,
    userName: log.userId ? (userNames.get(log.userId) ?? null) : null,
    before: log.before,
    after: log.after,
    createdAt: log.createdAt.toISOString(),
  }))
}

