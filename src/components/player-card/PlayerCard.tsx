import { useId } from 'react'
import type { PlayerCardDto } from '@/lib/player-card-query'
import {
  PLAYER_CARD_PALETTE as PALETTE,
  playerCardShieldHeight,
  playerCardShieldPath,
} from '@/lib/player-card-shield'
import { personInitials } from '@/lib/player-name'
import { BadgeDisco } from '@/components/badges/BadgeDisco'
import { PlayerCardPhoto } from '@/components/player-card/PlayerCardPhoto'

type Props = {
  card: PlayerCardDto
}

const CARD_FONT = 'font-[family-name:var(--font-oswald)]'

function formationBadgeText(partidosFaltantes: number): string {
  if (partidosFaltantes === 1) {
    return 'Falta 1 partido para tu primera carta completa'
  }
  return `Faltan ${partidosFaltantes} partidos para tu primera carta completa`
}

export function PlayerCard({ card }: Props) {
  const uid = useId()
  const { player, estado, partidosFaltantes, badgesRecientes } = card
  const enFormacion = estado === 'en_formacion'
  const earnedBadges = badgesRecientes ?? []

  const w = 310
  const h = playerCardShieldHeight(w)
  const s = w / 270

  const clipId = `clip-${uid}`
  const gradId = `grad-${uid}`
  const goldGradId = `gold-${uid}`
  const shield = playerCardShieldPath(w, h)

  return (
    <div
      className={`relative shrink-0 ${enFormacion ? 'grayscale' : ''}`}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        filter: `drop-shadow(0 ${6 * s}px ${20 * s}px rgba(0,0,0,0.55)) drop-shadow(0 0 ${12 * s}px rgba(61,230,140,0.12))`,
      }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <path d={shield} />
          </clipPath>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={PALETTE.bg1} />
            <stop offset="50%" stopColor={PALETTE.bg2} />
            <stop offset="100%" stopColor={PALETTE.bg3} />
          </linearGradient>
          <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c79a3e" />
            <stop offset="50%" stopColor="#e8c878" />
            <stop offset="100%" stopColor="#fff3d0" />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={w} height={h} fill={`url(#${gradId})`} />

          <g opacity="0.28">
            {[0, 14, 28, 42].map((o, i) => (
              <line
                key={o}
                x1={w * 0.55 + o * s}
                y1="0"
                x2={w + o * s}
                y2={h * 0.35 - o * s}
                stroke={PALETTE.lines}
                strokeWidth={i === 1 ? 4 * s : 1.5 * s}
              />
            ))}
            <line
              x1={w * 0.45}
              y1="0"
              x2={w}
              y2={h * 0.45}
              stroke={PALETTE.lines}
              strokeWidth={20 * s}
              opacity="0.35"
            />
          </g>

          <g opacity="0.22" fill={PALETTE.lines}>
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2].map((c) => (
                <polygon
                  key={`${r}-${c}`}
                  points={`${w * 0.62 + c * 16 * s},${h * 0.05 + r * 14 * s} ${w * 0.62 + c * 16 * s + 6 * s},${h * 0.05 + r * 14 * s + 9 * s} ${w * 0.62 + c * 16 * s - 6 * s},${h * 0.05 + r * 14 * s + 9 * s}`}
                />
              )),
            )}
          </g>

          <rect x="0" y={h * 0.54} width={w} height={h * 0.46} fill={PALETTE.bg3} opacity="0.5" />
        </g>

        <path d={shield} fill="none" stroke={`url(#${goldGradId})`} strokeWidth={3.5 * s} />
        <path
          d={shield}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1}
          opacity="0.2"
          transform={`translate(${w * 0.012}, ${h * 0.008}) scale(0.976, 0.976)`}
        />
      </svg>

      {/* Foto — recortada al escudo y contenida sobre la franja del nombre */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
        style={{ clipPath: `url(#${clipId})` }}
      >
        <div
          className="absolute flex items-end justify-center overflow-hidden"
          style={{
            left: `${w * 0.1}px`,
            right: `${w * 0.1}px`,
            top: `${h * 0.015}px`,
            bottom: `${h * 0.42}px`,
          }}
        >
          <div
            className="absolute bottom-[4%] left-1/2 h-[62%] w-[62%] -translate-x-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(61,230,140,0.18), transparent 70%)',
            }}
          />
          <PlayerCardPhoto
            fotoUrl={player.fotoUrl}
            fotoEsRecorte={player.fotoEsRecorte}
            alt={`Foto de ${player.nombre}`}
            initials={personInitials(player.nombreCorto)}
            variant="shield"
          />
        </div>
      </div>

      {/* Posición · escudo */}
      <div
        className="absolute z-10 flex flex-col items-center text-center"
        style={{
          top: `${h * 0.12}px`,
          left: `${w * 0.07}px`,
          gap: `${4 * s}px`,
        }}
      >
        <div
          className={`rounded-md border px-2 py-0.5 ${CARD_FONT} tracking-wide`}
          style={{
            fontSize: `${16 * s}px`,
            borderColor: 'rgba(61,230,140,0.35)',
            background: 'rgba(61,230,140,0.14)',
            color: PALETTE.text,
          }}
        >
          {player.posicion}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={player.escudoUrl}
          alt=""
          className="object-contain drop-shadow-md"
          style={{ width: `${32 * s}px`, height: `${32 * s}px` }}
        />
        {player.equipo ? (
          <span
            className="max-w-[72px] text-[9px] font-bold uppercase leading-tight tracking-[0.12em]"
            style={{ color: PALETTE.muted }}
          >
            {player.equipo}
          </span>
        ) : null}
      </div>

      {/* Nombre + premio */}
      <div
        className="absolute z-10 px-4 text-center"
        style={{ top: `${h * 0.515}px`, left: 0, right: 0 }}
      >
        {player.premio ? (
          <span
            className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: PALETTE.num }}
          >
            ◆ {player.premio} ◆
          </span>
        ) : null}
        <b
          className={`block truncate ${CARD_FONT} uppercase tracking-wide`}
          style={{ fontSize: `${22 * s}px`, color: PALETTE.text }}
        >
          {player.nombreCorto}
        </b>
      </div>

      <div
        className="absolute z-10"
        style={{
          top: `${h * 0.595}px`,
          left: `${w * 0.12}px`,
          right: `${w * 0.12}px`,
          height: `${1.5 * s}px`,
          background: `linear-gradient(90deg, transparent, ${PALETTE.num}55, transparent)`,
        }}
      />

      {/* Insignias ganadas */}
      <div
        className="absolute z-10 px-3 text-center"
        style={{ top: `${h * 0.62}px`, left: 0, right: 0 }}
      >
        <span
          className="text-[9px] font-bold uppercase tracking-[0.22em]"
          style={{ color: PALETTE.muted }}
        >
          Insignias
        </span>
        {earnedBadges.length > 0 ? (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {earnedBadges.map((badge) => (
              <span key={`${badge.iconKey}-${badge.name}`} title={badge.name}>
                <BadgeDisco rarity={badge.rarity} iconKey={badge.iconKey} size="sm" />
              </span>
            ))}
          </div>
        ) : (
          <p
            className="mt-2 text-[10px] font-semibold leading-snug"
            style={{ color: `${PALETTE.muted}cc` }}
          >
            Aún sin insignias en la cancha
          </p>
        )}
      </div>

      {enFormacion ? (
        <div
          className="absolute inset-x-4 bottom-3 z-20 rounded-lg border px-3 py-2 text-center text-xs font-semibold"
          style={{
            borderColor: '#22382e',
            background: 'rgba(18,33,27,0.95)',
            color: PALETTE.lines,
          }}
        >
          {formationBadgeText(partidosFaltantes)}
        </div>
      ) : null}
    </div>
  )
}
