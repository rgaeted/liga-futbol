'use client'

import { useState } from 'react'
import { GrantPlayerAwardForm } from './GrantPlayerAwardForm'
import { PlayerAwardsPanel } from './PlayerAwardsPanel'

type PlayerOption = { id: string; name: string; teamName: string | null }
type AwardOption = { id: string; name: string; emoji: string; shortLabel: string }
type SeasonOption = { id: string; name: string }

export function AwardsGrantSection({
  players,
  awards,
  seasons,
}: {
  players: PlayerOption[]
  awards: AwardOption[]
  seasons: SeasonOption[]
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const selectedPlayer = players.find((p) => p.id === selectedPlayerId)

  return (
    <div className="space-y-4">
      <GrantPlayerAwardForm
        players={players}
        awards={awards}
        seasons={seasons}
        onGranted={(playerId) => setSelectedPlayerId(playerId)}
        onPlayerChange={(playerId) => setSelectedPlayerId(playerId)}
      />
      <PlayerAwardsPanel
        playerId={selectedPlayerId}
        playerName={selectedPlayer?.name}
      />
    </div>
  )
}
