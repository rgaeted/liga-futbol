'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MatchType } from '@prisma/client'
import { footballFormatLabel } from '@/lib/football-format'
import { matchStatusBadgeClass, matchStatusLabel } from '@/lib/match-status-ui'
import { APP_LOCALE } from '@/lib/locale'
import {
  formatScheduleDateLabel,
  formatScheduleTimeLabel,
} from '@/lib/schedule-datetime'
import { FriendlyPaidIconToggle } from '@/components/admin/FriendlyPaidIconToggle'
import { FriendlyGalletaIconToggle } from '@/components/admin/FriendlyGalletaIconToggle'
import { MatchActions, type MatchRow } from '@/components/admin/MatchActions'
import { DeleteButton } from '@/components/admin/DeleteButton'
import type { FriendlyRosterPlayer } from '@/components/admin/FriendlyMatchConvocationPicker'

type FriendlyPlayerRow = {
  participationId: string
  side: 'A' | 'B'
  label: string
  paid: boolean
  isGalleta: boolean
  isCaptain: boolean
  isCoach: boolean
}

type RefereeOption = { id: string; name: string }

type Props = {
  title: string
  matchType: MatchType
  typeBadge: string
  scheduledAt: Date
  refereeName: string | null
  footballFormat: MatchRow['footballFormat']
  homeScore: number
  awayScore: number
  status: string
  sideAName: string
  sideBName: string
  friendlyPlayers: FriendlyPlayerRow[]
  match: MatchRow
  referees: RefereeOption[]
  rosterPlayers: FriendlyRosterPlayer[]
}

function SideColumn({
  label,
  colorClass,
  players,
  matchId,
}: {
  label: string
  colorClass: string
  players: FriendlyPlayerRow[]
  matchId: string
}) {
  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        if (a.paid !== b.paid) return a.paid ? -1 : 1
        return a.label.localeCompare(b.label, APP_LOCALE)
      }),
    [players]
  )

  const splitIndex = sorted.findIndex((player) => !player.paid)

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className={`font-ui text-xs font-bold uppercase tracking-wider ${colorClass}`}>{label}</p>
        <span className="rounded-md bg-kelme-gray-100 px-2 py-0.5 font-mono text-xs text-kelme-gray-600">
          {players.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((player, index) => {
          const showDivider = splitIndex > 0 && index === splitIndex
          const suffix = [
            player.isCaptain ? 'Capitán' : null,
            player.isCoach ? 'DT' : null,
            player.isGalleta ? 'Galleta' : null,
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <li key={player.participationId}>
              {showDivider && <hr className="my-2 border-kelme-border" />}
              <div className="flex items-center gap-2">
                <FriendlyPaidIconToggle
                  matchId={matchId}
                  participationId={player.participationId}
                  initialPaid={player.paid}
                />
                <FriendlyGalletaIconToggle
                  matchId={matchId}
                  participationId={player.participationId}
                  initialIsGalleta={player.isGalleta}
                />
                <span className="min-w-0 truncate text-sm text-kelme-gray-800">
                  {player.label}
                  {suffix ? (
                    <span className="text-kelme-gray-400"> ({suffix})</span>
                  ) : null}
                </span>
              </div>
            </li>
          )
        })}
        {players.length === 0 && (
          <li className="text-sm text-kelme-gray-400">Sin jugadores</li>
        )}
      </ul>
    </div>
  )
}

export function AdminMatchCard({
  title,
  matchType,
  typeBadge,
  scheduledAt,
  refereeName,
  footballFormat,
  homeScore,
  awayScore,
  status,
  sideAName,
  sideBName,
  friendlyPlayers,
  match,
  referees,
  rosterPlayers,
}: Props) {
  const [editing, setEditing] = useState(false)

  const sideA = friendlyPlayers.filter((player) => player.side === 'A')
  const sideB = friendlyPlayers.filter((player) => player.side === 'B')
  const paidTotal = friendlyPlayers.filter((player) => player.paid).length
  const unpaidTotal = friendlyPlayers.length - paidTotal
  const when = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt)
  const dateLabel = formatScheduleDateLabel(when)
  const timeLabel = formatScheduleTimeLabel(when)

  return (
    <article className="overflow-hidden rounded-2xl border border-kelme-border bg-white shadow-sm">
      <div className="border-b border-kelme-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl" aria-hidden>
              ⚽
            </span>
            <h2 className="font-display text-xl font-bold text-kelme-gray-900">{title}</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                matchType === MatchType.FRIENDLY
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {typeBadge}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-kelme-gray-50 px-3 py-1.5 text-xs text-kelme-gray-700">
            <span aria-hidden>📅</span>
            {dateLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-kelme-gray-50 px-3 py-1.5 text-xs text-kelme-gray-700">
            <span aria-hidden>🕐</span>
            {timeLabel}
          </span>
          {refereeName && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-kelme-gray-50 px-3 py-1.5 text-xs text-kelme-gray-700">
              <span aria-hidden>👤</span>
              {refereeName}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-kelme-gray-50 px-3 py-1.5 text-xs text-kelme-gray-700">
            <span aria-hidden>📍</span>
            {footballFormatLabel(footballFormat)}
          </span>
        </div>
      </div>

      {matchType === MatchType.FRIENDLY && friendlyPlayers.length > 0 && (
        <div className="grid gap-4 border-b border-kelme-border px-5 py-4 sm:grid-cols-2">
          <SideColumn
            label={`Lado A · ${sideAName}`}
            colorClass="text-kelme-red"
            players={sideA}
            matchId={match.id}
          />
          <SideColumn
            label={`Lado B · ${sideBName}`}
            colorClass="text-blue-600"
            players={sideB}
            matchId={match.id}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-b border-kelme-border bg-kelme-gray-50 px-5 py-4">
        <div>
          <p className="font-ui text-xs font-semibold uppercase tracking-wider text-kelme-gray-400">
            Resumen
          </p>
          <p className="font-display text-4xl font-extrabold tabular-nums text-kelme-gray-900">
            {homeScore} - {awayScore}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${matchStatusBadgeClass(status)}`}
          >
            {matchStatusLabel(status)}
          </span>
        </div>

        {matchType === MatchType.FRIENDLY && friendlyPlayers.length > 0 && (
          <>
            <div className="hidden h-12 w-px bg-kelme-border sm:block" />
            <div className="flex gap-6 text-sm">
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                    ✓
                  </span>
                  Pagó
                </p>
                <p className="font-display text-2xl font-bold tabular-nums">{paidTotal}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-kelme-gray-500">
                  <span className="h-4 w-4 rounded-full border-2 border-kelme-gray-300" />
                  No pagó
                </p>
                <p className="font-display text-2xl font-bold tabular-nums">{unpaidTotal}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-2 px-5 py-4">
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`/live/${match.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <span aria-hidden>📡</span>
            Ver en vivo
          </Link>
          <Link
            href={`/admin/matches/${match.id}/timeline`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-kelme-border bg-white px-3 py-2.5 text-sm font-semibold text-kelme-gray-800 hover:bg-kelme-gray-50"
          >
            <span aria-hidden>🕐</span>
            Cronología
          </Link>
          <Link
            href={`/admin/matches/${match.id}/lineup`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-kelme-border bg-white px-3 py-2.5 text-sm font-semibold text-kelme-gray-800 hover:bg-kelme-gray-50"
          >
            <span aria-hidden>👥</span>
            Formación
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-kelme-border bg-white px-3 py-2.5 text-sm font-semibold text-kelme-gray-800 hover:bg-kelme-gray-50"
          >
            <span aria-hidden>✏️</span>
            Editar
          </button>
          <DeleteButton
            url={`/api/matches/${match.id}`}
            confirmMessage={`¿Eliminar el partido ${title}? Se borran sus eventos y citaciones.`}
            variant="card"
          />
        </div>
      </div>

      {editing && (
        <MatchActions
          match={match}
          referees={referees}
          friendlyPlayers={rosterPlayers}
          editing={editing}
          onEditingChange={setEditing}
          hideIdleToolbar
        />
      )}
    </article>
  )
}
