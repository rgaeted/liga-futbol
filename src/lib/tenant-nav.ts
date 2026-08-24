import { db } from '@/lib/db'
import type { MembershipRole } from '@/lib/membership-role'
import { MembershipRole as Role, hasMembershipRole } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import type { DashboardNavGroup } from '@/components/dashboard/dashboard-ui'

export type TenantNavContext = {
  roles: MembershipRole[]
  hasPlayerProfile: boolean
  hasFriendlyCoachParticipations: boolean
}

export async function loadTenantNavContext(
  userId: string,
  organizationId: string,
  roles: MembershipRole[],
): Promise<TenantNavContext> {
  const [playerCount, coachPartCount] = await Promise.all([
    db.player.count({
      where: {
        person: { userId },
      },
    }),
    db.friendlyMatchPlayer.count({
      where: {
        isCoach: true,
        player: { person: { userId } },
      },
    }),
  ])

  return {
    roles,
    hasPlayerProfile: playerCount > 0 || hasMembershipRole(roles, Role.PLAYER),
    hasFriendlyCoachParticipations:
      coachPartCount > 0 || hasMembershipRole(roles, Role.FRIENDLY_COACH),
  }
}

function adminNavGroups(slug: string): DashboardNavGroup[] {
  const base = (path: string) => orgPath(slug, path)
  return [
    {
      label: 'Administración',
      items: [{ href: base('/admin'), label: 'Resumen', icon: 'IN' }],
    },
    {
      label: 'Competición',
      items: [
        { href: base('/admin/teams'), label: 'Equipos', icon: 'EQ' },
        { href: base('/admin/players'), label: 'Jugadores', icon: 'JU' },
        {
          href: base('/admin/matches'),
          label: 'Partidos',
          icon: 'PA',
          activePrefixes: [base('/admin/matches'), base('/admin/friendly-categories')],
        },
        {
          href: base('/admin/referees'),
          label: 'Árbitros',
          icon: 'AR',
          activePrefixes: [base('/admin/referees')],
        },
      ],
    },
    {
      label: 'Liga',
      items: [
        { href: base('/admin/seasons'), label: 'Temporadas', icon: 'TE' },
        {
          href: base('/admin/challenges'),
          label: 'Desafíos',
          icon: 'DE',
          activePrefixes: [base('/admin/challenges')],
        },
        {
          href: base('/admin/content'),
          label: 'Contenido',
          icon: 'CO',
          activePrefixes: [
            base('/admin/content'),
            base('/admin/content/articles'),
            base('/admin/content/galleries'),
            base('/admin/content/sponsors'),
          ],
        },
      ],
    },
    {
      label: 'Usuarios',
      items: [{ href: base('/admin/users'), label: 'Cuentas', icon: 'US' }],
    },
  ]
}

export function buildTenantNavGroups(
  slug: string,
  context: TenantNavContext,
): DashboardNavGroup[] {
  const groups: DashboardNavGroup[] = []
  const base = (path: string) => orgPath(slug, path)

  if (hasMembershipRole(context.roles, Role.ORG_ADMIN)) {
    groups.push(...adminNavGroups(slug))
  }

  if (hasMembershipRole(context.roles, Role.COACH)) {
    groups.push({
      label: 'DT liga',
      items: [
        { href: base('/coach'), label: 'Partidos', icon: 'PA' },
        { href: base('/coach/evaluations'), label: 'Evaluaciones', icon: 'EV' },
      ],
    })
  }

  if (hasMembershipRole(context.roles, Role.REFEREE)) {
    groups.push({
      label: 'Árbitro',
      items: [{ href: base('/referee'), label: 'Mis partidos', icon: 'AR' }],
    })
  }

  if (context.hasPlayerProfile) {
    groups.push({
      label: 'Jugador',
      items: [
        { href: base('/player'), label: 'Mi panel', icon: 'IN' },
        { href: base('/player/matches'), label: 'Mis partidos', icon: 'PA' },
      ],
    })
  }

  if (context.hasFriendlyCoachParticipations) {
    groups.push({
      label: 'DT amistoso',
      items: [{ href: base('/player/friendly-matches'), label: 'Amistosos como DT', icon: 'AM' }],
    })
  }

  return groups
}

export function tenantRoleLabel(context: TenantNavContext): string {
  if (hasMembershipRole(context.roles, Role.ORG_ADMIN)) return 'Administrador'
  if (hasMembershipRole(context.roles, Role.COACH)) return 'Director técnico'
  if (hasMembershipRole(context.roles, Role.REFEREE)) return 'Árbitro'
  if (context.hasFriendlyCoachParticipations) return 'DT amistoso'
  if (context.hasPlayerProfile) return 'Jugador'
  return 'Usuario'
}
