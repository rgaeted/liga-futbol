import { NextResponse } from 'next/server'
import { SeasonRosterStatus, SeasonTeamStatus } from '@prisma/client'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { db } from '@/lib/db'
import { mapPrismaError } from '@/lib/prisma-errors'
import {
  countRegisteredTeams,
  validateEnrollmentPlayerCategories,
  validateSeasonEnrollment,
} from '@/lib/season-enrollment-validation'
import { seasonEnrollmentSchema } from '@/lib/validations/mobile-season'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { organizationId } = await requireAdminSeason(id)

    const [teams, seasonCategories, seasonTeams] = await Promise.all([
      db.team.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
        include: {
          players: {
            include: {
              ...PLAYER_PERSON_NAME_INCLUDE,
              categories: { select: { friendlyCategoryId: true } },
            },
            orderBy: { jerseyNumber: 'asc' },
          },
        },
      }),
      db.seasonCategory.findMany({
        where: { seasonId: id },
        orderBy: { sortOrder: 'asc' },
        include: { category: { select: { id: true, name: true } } },
      }),
      db.seasonTeam.findMany({
        where: { seasonId: id },
        include: {
          rosterEntries: {
            where: { status: SeasonRosterStatus.ACTIVE },
            select: { playerId: true },
          },
        },
      }),
    ])

    const enrolledByCategoryTeam = new Map<string, string[]>()
    for (const st of seasonTeams) {
      if (!st.seasonCategoryId) continue
      enrolledByCategoryTeam.set(
        `${st.seasonCategoryId}:${st.teamId}`,
        st.rosterEntries.map((e) => e.playerId),
      )
    }

    const teamPayload = teams.map((team) => ({
      teamId: team.id,
      name: team.name,
      color: team.color,
      players: team.players.map((p) => ({
        id: p.id,
        name: playerDisplayName(p),
        jerseyNumber: p.jerseyNumber,
        position: p.position,
        categoryIds: p.categories.map((link) => link.friendlyCategoryId),
      })),
    }))

    const categories = seasonCategories.map((sc) => ({
      categoryId: sc.category.id,
      seasonCategoryId: sc.id,
      name: sc.category.name,
      teams: teamPayload.map((team) => ({
        ...team,
        selectedPlayerIds:
          enrolledByCategoryTeam.get(`${sc.id}:${team.teamId}`) ?? [],
      })),
    }))

    return NextResponse.json({ categories })
  } catch (error) {
    const mappedSeason = mapAdminSeasonRouteError(error)
    if (mappedSeason) {
      return NextResponse.json({ error: mappedSeason.message }, { status: mappedSeason.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { organizationId } = await requireAdminSeason(id)
    const parsed = seasonEnrollmentSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de inscripción inválidos' }, { status: 400 })
    }

    const seasonCategory = await db.seasonCategory.findFirst({
      where: { seasonId: id, categoryId: parsed.data.categoryId },
    })
    if (!seasonCategory) {
      return NextResponse.json(
        { error: 'La categoría no pertenece a esta temporada.' },
        { status: 400 },
      )
    }

    const eligibleLinks = await db.playerCategory.findMany({
      where: { friendlyCategoryId: parsed.data.categoryId },
      select: { playerId: true },
    })
    const eligiblePlayerIds = new Set(eligibleLinks.map((link) => link.playerId))
    for (const team of parsed.data.teams) {
      const categoryError = validateEnrollmentPlayerCategories(team.playerIds, eligiblePlayerIds)
      if (categoryError) {
        return NextResponse.json({ error: categoryError }, { status: 400 })
      }
    }

    const validationError = validateSeasonEnrollment(parsed.data)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      const submittedTeamIds = new Set(parsed.data.teams.map((t) => t.teamId))

      await tx.seasonTeam.updateMany({
        where: {
          seasonCategoryId: seasonCategory.id,
          teamId: { notIn: [...submittedTeamIds] },
        },
        data: { status: SeasonTeamStatus.WITHDRAWN },
      })

      for (const [index, team] of parsed.data.teams.entries()) {
        const dbTeam = await tx.team.findUnique({ where: { id: team.teamId } })
        if (!dbTeam || dbTeam.organizationId !== organizationId) continue

        const seasonTeam = await tx.seasonTeam.upsert({
          where: {
            seasonCategoryId_teamId: {
              seasonCategoryId: seasonCategory.id,
              teamId: team.teamId,
            },
          },
          create: {
            seasonId: id,
            seasonCategoryId: seasonCategory.id,
            teamId: team.teamId,
            displayName: team.displayName,
            color: team.color ?? dbTeam.color,
            crestMimeType: dbTeam.crestMimeType,
            crestData: dbTeam.crestData ?? undefined,
            status: SeasonTeamStatus.REGISTERED,
            sortOrder: team.sortOrder ?? index,
          },
          update: {
            displayName: team.displayName,
            color: team.color ?? dbTeam.color,
            status: SeasonTeamStatus.REGISTERED,
            sortOrder: team.sortOrder ?? index,
          },
        })

        const submittedPlayerIds = new Set(team.playerIds)
        await tx.seasonRosterEntry.updateMany({
          where: {
            seasonTeamId: seasonTeam.id,
            playerId: { notIn: [...submittedPlayerIds] },
          },
          data: { status: SeasonRosterStatus.INACTIVE },
        })

        for (const playerId of team.playerIds) {
          const player = await tx.player.findUnique({
            where: { id: playerId },
            select: { jerseyNumber: true, position: true },
          })
          if (!player) continue
          await tx.seasonRosterEntry.upsert({
            where: { seasonTeamId_playerId: { seasonTeamId: seasonTeam.id, playerId } },
            create: {
              seasonTeamId: seasonTeam.id,
              playerId,
              jerseyNumber: player.jerseyNumber,
              position: player.position,
              status: SeasonRosterStatus.ACTIVE,
            },
            update: {
              jerseyNumber: player.jerseyNumber,
              position: player.position,
              status: SeasonRosterStatus.ACTIVE,
            },
          })
        }
      }
    })

    return NextResponse.json({
      ok: true,
      registeredTeams: countRegisteredTeams(parsed.data),
    })
  } catch (error) {
    const mappedSeason = mapAdminSeasonRouteError(error)
    if (mappedSeason) {
      return NextResponse.json({ error: mappedSeason.message }, { status: mappedSeason.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
