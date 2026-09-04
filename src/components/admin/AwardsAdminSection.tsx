'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrgAwardForm } from './OrgAwardForm'
import { OrgAwardsTable, type OrgAwardRow } from './OrgAwardsTable'
import { AwardsGrantSection } from './AwardsGrantSection'

type PlayerOption = { id: string; name: string; teamName: string | null }
type SeasonOption = { id: string; name: string }

type ApiOrgAward = {
  id: string
  name: string
  shortLabel: string
  emoji: string
  description: string | null
  accentColor: string | null
  sortOrder: number
  isActive: boolean
  _count: { playerAwards: number }
}

function mapAwardRows(items: ApiOrgAward[]): OrgAwardRow[] {
  return items.map((award) => ({
    id: award.id,
    name: award.name,
    shortLabel: award.shortLabel,
    emoji: award.emoji,
    description: award.description,
    accentColor: award.accentColor,
    sortOrder: award.sortOrder,
    isActive: award.isActive,
    playerCount: award._count.playerAwards,
  }))
}

export function AwardsAdminSection({
  initialAwards,
  players,
  seasons,
}: {
  initialAwards: OrgAwardRow[]
  players: PlayerOption[]
  seasons: SeasonOption[]
}) {
  const router = useRouter()
  const [awards, setAwards] = useState(initialAwards)

  useEffect(() => {
    setAwards(initialAwards)
  }, [initialAwards])

  const reloadAwards = useCallback(async () => {
    try {
      const res = await fetch('/api/org-awards')
      if (!res.ok) return
      const data = (await res.json()) as ApiOrgAward[]
      setAwards(mapAwardRows(data))
    } finally {
      router.refresh()
    }
  }, [router])

  const activeAwards = awards.filter((award) => award.isActive)

  return (
    <>
      <OrgAwardForm onCreated={reloadAwards} />
      <OrgAwardsTable awards={awards} onChanged={reloadAwards} />
      <AwardsGrantSection
        players={players}
        awards={activeAwards.map((award) => ({
          id: award.id,
          name: award.name,
          emoji: award.emoji,
          shortLabel: award.shortLabel,
        }))}
        seasons={seasons}
      />
    </>
  )
}
