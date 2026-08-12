import { NextResponse } from 'next/server'
import { Role, SeasonRosterStatus, SeasonTeamStatus } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { mapPrismaError } from '@/lib/prisma-errors'
import {
  countRegisteredTeams,
  validateSeasonEnrollment,
} from '@/lib/season-enrollment-validation'
import { seasonEnrollmentSchema } from '@/lib/validations/mobile-season'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.ADMIN])
    const { id } = await params

    const teams = await db.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        players: {
          include: { user: { select: { name: true } } },
          orderBy: { jerseyNumber: 'asc' },
        },
      },
    })

    const seasonTeams = await db.seasonTeam.findMany({
      where: { seasonId: id },
      include: {
        rosterEntries: {
          where: { status: SeasonRosterStatus.ACTIVE },
          select: { playerId: true },
        },
      },
    })

    const enrolledByTeamId = new Map(
      seasonTeams.map((st) => [st.teamId, st.rosterEntries.map((e) => e.playerId)]),
    )

    return NextResponse.json({
      teams: teams.map((team) => ({
        teamId: team.id,
        name: team.name,
        color: team.color,
        players: team.players.map((p) => ({
          id: p.id,
          name: p.user.name,
          jerseyNumber: p.jerseyNumber,
          position: p.position,
        })),
        selectedPlayerIds: enrolledByTeamId.get(team.id) ?? [],
      })),
      enrollment: seasonTeams.map((st) => ({
        teamId: st.teamId,
        displayName: st.displayName,
        color: st.color,
        sortOrder: st.sortOrder,
        playerIds: st.rosterEntries.map((e) => e.playerId),
      })),
    })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId } = await params
    const parsed = seasonEnrollmentSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de inscripción inválidos' }, { status: 400 })
    }

    const validationError = validateSeasonEnrollment(parsed.data)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      const submittedTeamIds = new Set(parsed.data.teams.map((t) => t.teamId))

      await tx.seasonTeam.updateMany({
        where: { seasonId, teamId: { notIn: [...submittedTeamIds] } },
        data: { status: SeasonTeamStatus.WITHDRAWN },
      })

      for (const [index, team] of parsed.data.teams.entries()) {
        const dbTeam = await tx.team.findUnique({ where: { id: team.teamId } })
        if (!dbTeam) continue

        const seasonTeam = await tx.seasonTeam.upsert({
          where: { seasonId_teamId: { seasonId, teamId: team.teamId } },
          create: {
            seasonId,
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
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
