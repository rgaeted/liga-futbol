import { planHasCapability, type BillingPlan, type Capability } from '@/lib/billing/capabilities'
import { db } from '@/lib/db'
import type { MembershipRole } from '@/lib/membership-role'
import { MembershipRole as Role, hasMembershipRole } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import type { DashboardNavGroup } from '@/components/dashboard/dashboard-ui'
import { resolveUserNavAvatarUrl } from '@/lib/user-nav-avatar'

export type TenantNavContext = {
  roles: MembershipRole[]
  hasPlayerProfile: boolean
  hasFriendlyCoachParticipations: boolean
  userAvatarUrl: string | null
  plan: BillingPlan
}

export async function loadTenantNavContext(
  userId: string,
  organizationId: string,
  roles: MembershipRole[],
): Promise<TenantNavContext> {
  const [playerCount, coachPartCount, userAvatarUrl, org] = await Promise.all([
    db.player.count({
      where: {
        organizationId,
        person: { userId },
      },
    }),
    db.friendlyMatchPlayer.count({
      where: {
        isCoach: true,
        player: { organizationId, person: { userId } },
      },
    }),
    resolveUserNavAvatarUrl(userId),
    db.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    }),
  ])

  return {
    roles,
    hasPlayerProfile: playerCount > 0 || hasMembershipRole(roles, Role.PLAYER),
    hasFriendlyCoachParticipations:
      coachPartCount > 0 || hasMembershipRole(roles, Role.FRIENDLY_COACH),
    userAvatarUrl,
    plan: org?.plan ?? 'FREE',
  }
}

function adminNavItemCapability(href: string): Capability | null {
  if (href.includes('/admin/seasons')) return 'MANAGE_SEASONS'
  if (href.includes('/admin/content')) return 'MANAGE_LEAGUE_CONTENT'
  if (href.includes('/admin/awards')) return 'MANAGE_LEAGUE_CONTENT'
  if (href.includes('/admin/badges')) return 'MANAGE_LEAGUE_CONTENT'
  if (href.includes('/admin/branding')) return 'PUBLISH_ORG_LANDING'
  return null
}

function isAdminNavItemAllowed(href: string, plan: BillingPlan): boolean {
  const capability = adminNavItemCapability(href)
  if (!capability) return true
  return planHasCapability(plan, capability)
}

function adminNavGroups(slug: string, plan: BillingPlan): DashboardNavGroup[] {
  const base = (path: string) => orgPath(slug, path)
  const groups: DashboardNavGroup[] = [
    {
      label: 'Administración',
      items: [
        { href: base('/admin'), label: 'Resumen', icon: 'IN' },
        {
          href: base('/admin/estadisticas'),
          label: 'Estadísticas',
          icon: 'ES',
          activePrefixes: [base('/admin/estadisticas')],
        },
        {
          href: base('/admin/branding'),
          label: 'Landing',
          icon: 'LD',
          activePrefixes: [base('/admin/branding')],
        },
      ],
    },
    {
      label: 'Competición',
      items: [
        { href: base('/admin/teams'), label: 'Equipos', icon: 'EQ' },
        { href: base('/admin/players'), label: 'Jugadores', icon: 'JU' },
        { href: base('/admin/awards'), label: 'Premios', icon: 'PR' },
        { href: base('/admin/badges'), label: 'Insignias', icon: 'IG' },
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
          activePrefixes: [base('/admin/referees'), base('/admin/referees/')],
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

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isAdminNavItemAllowed(item.href, plan)),
    }))
    .filter((group) => group.items.length > 0)
}

export function buildTenantNavGroups(
  slug: string,
  context: TenantNavContext,
): DashboardNavGroup[] {
  const groups: DashboardNavGroup[] = []
  const base = (path: string) => orgPath(slug, path)

  if (hasMembershipRole(context.roles, Role.ORG_ADMIN)) {
    groups.push(...adminNavGroups(slug, context.plan))
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
      items: [
        { href: base('/referee'), label: 'Mi panel', icon: 'IN', exactMatch: true },
        {
          href: base('/referee/matches'),
          label: 'Mis partidos',
          icon: 'PA',
          activePrefixes: [base('/referee/matches')],
        },
      ],
    })
  }

  if (context.hasPlayerProfile) {
    groups.push({
      label: 'Jugador',
      items: [
        { href: base('/player'), label: 'Mi panel', icon: 'IN', exactMatch: true },
        {
          href: base('/player/profile'),
          label: 'Mi perfil',
          icon: 'PR',
          activePrefixes: [base('/player/profile')],
        },
        {
          href: `/${slug}#asistencia`,
          label: '¿Quién va?',
          icon: 'VA',
        },
        {
          href: base('/player/matches'),
          label: 'Mis partidos',
          icon: 'PA',
          activePrefixes: [base('/player/matches')],
        },
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
