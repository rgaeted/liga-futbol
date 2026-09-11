import { MatchStatus, MatchType, OrganizationStatus } from '@prisma/client'
import {
  calcularCarta,
  PLAYER_CARD_MIN_PJ,
  PLAYER_CARD_WINDOW_DAYS,
  playerCardShortName,
  type PlayerCardAtributos,
  type PlayerCardEstado,
  type PlayerCardPosition,
} from '@/lib/player-card'
import { aggregatePlayerCardWindow } from '@/lib/player-card-window'
import { getPlayerRecentBadges } from '@/lib/badges/query'
import { db } from '@/lib/db'
import { APP_TIMEZONE } from '@/lib/locale'
import { LOSLUNES_LOGO_PATH, LOSLUNES_SLUG } from '@/lib/org-brand'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

function isoDateInAppTz(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export type PlayerCardDto = {
  player: {
    id: string
    nombre: string
    nombreCorto: string
    posicion: PlayerCardPosition
    equipo: string | null
    fotoUrl: string
    escudoUrl: string
    premio: string | null
  }
  ventana: {
    dias: number
    desde: string
    hasta: string
    fechasPosibles: number
    pj: number
    minPj: number
  }
  crudos: {
    goles: number
    asistencias: number
    presencias: number
    mvps: number
    amarillas: number
    rojas: number
    rachaGoleadora: number
    rachaPresencia: number
  }
  atributos: PlayerCardAtributos
  ovr: number | null
  estado: PlayerCardEstado
  partidosFaltantes: number
  badgesRecientes?: Array<{ rarity: string; iconKey: string; name: string }>
}

export async function getLosLunesPlayerCard(
  playerId: string,
): Promise<
  { kind: 'ok'; card: PlayerCardDto } | { kind: 'not_found' } | { kind: 'paused' }
> {
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: {
      organization: { select: { slug: true, status: true, badgesEnabled: true } },
      ...PLAYER_PERSON_NAME_INCLUDE,
      playerAwards: {
        orderBy: { awardedAt: 'desc' },
        take: 1,
        include: { orgAward: { select: { name: true } } },
      },
    },
  })

  if (!player) return { kind: 'not_found' }
  if (player.organization.slug !== LOSLUNES_SLUG) return { kind: 'not_found' }
  if (player.organization.status === OrganizationStatus.PAUSED) return { kind: 'paused' }

  const hasta = new Date()
  const desde = new Date(hasta.getTime() - PLAYER_CARD_WINDOW_DAYS * 86_400_000)

  const matches = await db.match.findMany({
    where: {
      organizationId: player.organizationId,
      matchType: MatchType.FRIENDLY,
      status: MatchStatus.FINISHED,
      scheduledAt: { gte: desde, lte: hasta },
    },
    select: {
      id: true,
      scheduledAt: true,
      sideAName: true,
      sideBName: true,
      friendlyPlayers: { select: { playerId: true, side: true } },
      events: { select: { type: true, playerId: true, assistPlayerId: true } },
      teamMvps: { select: { playerId: true } },
    },
  })

  const matchRows = matches.map((match) => ({
    id: match.id,
    scheduledAt: match.scheduledAt,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    roster: match.friendlyPlayers.map((fp) => ({
      playerId: fp.playerId,
      side: fp.side as 'A' | 'B',
    })),
    events: match.events,
    mvpPlayerIds: match.teamMvps
      .map((m) => m.playerId)
      .filter((id): id is string => id != null),
  }))

  const window = aggregatePlayerCardWindow(matchRows, playerId)
  const card = calcularCarta({
    playerId,
    primaryPosition: player.primaryPosition,
    position: player.position,
    pj: window.pj,
    goles: window.goles,
    asistencias: window.asistencias,
    presencias: window.presencias,
    fechasPosibles: window.fechasPosibles,
    mvps: window.mvps,
    rojas: window.rojas,
    rachaGoleadora: window.rachaGoleadora,
    rachaPresencia: window.rachaPresencia,
    p10GolesPorPartido: window.p10GolesPorPartido,
    p90GolesPorPartido: window.p90GolesPorPartido,
    p10AsistPorPartido: window.p10AsistPorPartido,
    p90AsistPorPartido: window.p90AsistPorPartido,
  })

  const nombre = playerDisplayName(player)
  const premio = player.playerAwards[0]?.orgAward.name ?? null
  const badgesRecientes = player.organization.badgesEnabled
    ? await getPlayerRecentBadges(player.organizationId, playerId)
    : undefined

  return {
    kind: 'ok',
    card: {
      player: {
        id: playerId,
        nombre,
        nombreCorto: playerCardShortName(nombre),
        posicion: card.posicion,
        equipo: window.lastSideName,
        fotoUrl: `/api/players/${playerId}/photo`,
        escudoUrl: LOSLUNES_LOGO_PATH,
        premio,
      },
      ventana: {
        dias: PLAYER_CARD_WINDOW_DAYS,
        desde: isoDateInAppTz(desde),
        hasta: isoDateInAppTz(hasta),
        fechasPosibles: window.fechasPosibles,
        pj: window.pj,
        minPj: PLAYER_CARD_MIN_PJ,
      },
      crudos: {
        goles: window.goles,
        asistencias: window.asistencias,
        presencias: window.presencias,
        mvps: window.mvps,
        amarillas: window.amarillas,
        rojas: window.rojas,
        rachaGoleadora: window.rachaGoleadora,
        rachaPresencia: window.rachaPresencia,
      },
      atributos: card.atributos,
      ovr: card.ovr,
      estado: card.estado,
      partidosFaltantes: card.partidosFaltantes,
      badgesRecientes,
    },
  }
}
