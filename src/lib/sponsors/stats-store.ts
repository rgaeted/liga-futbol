import { db } from '@/lib/db'
import { statMonth } from '@/lib/sponsors/stats'

/** Suma una vista o un clic al mes actual de cada auspiciador. Atómico (upsert + increment). */
export async function recordSponsorStat(
  sponsorIds: string[],
  kind: 'views' | 'clicks',
  now: Date = new Date(),
): Promise<void> {
  const month = statMonth(now)
  await Promise.all(
    sponsorIds.map((sponsorId) =>
      db.sponsorMonthlyStat.upsert({
        where: { sponsorId_month: { sponsorId, month } },
        create: { sponsorId, month, [kind]: 1 },
        update: { [kind]: { increment: 1 } },
      }),
    ),
  )
}
