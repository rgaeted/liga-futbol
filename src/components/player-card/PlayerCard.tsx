import { useId } from 'react'
import { PLAYER_CARD_HOT_THRESHOLD } from '@/lib/player-card'
import type { PlayerCardDto } from '@/lib/player-card-query'
import {
  formatPlayerCardStat,
  PLAYER_CARD_PALETTE as PALETTE,
  PLAYER_CARD_STAT_LABELS as STAT_LABELS,
  PLAYER_CARD_STAT_PAIRS as STAT_PAIRS,
  playerCardGolPorPartido,
  playerCardShieldHeight,
  playerCardShieldPath,
} from '@/lib/player-card-shield'
import { personInitials } from '@/lib/player-name'
import { BadgeDisco } from '@/components/badges/BadgeDisco'
import { PlayerCardPhoto } from '@/components/player-card/PlayerCardPhoto'

type Props = {
  card: PlayerCardDto
}

function formationBadgeText(partidosFaltantes: number): string {
  if (partidosFaltantes === 1) {
    return 'Falta 1 partido para tu primera carta completa'
  }
  return `Faltan ${partidosFaltantes} partidos para tu primera carta completa`
}

export function PlayerCard({ card }: Props) {
  const uid = useId()
  const { player, ventana, crudos, atributos, ovr, estado, partidosFaltantes, badgesRecientes } =
    card
  const enFormacion = estado === 'en_formacion'
  const recentBadges = badgesRecientes?.slice(0, 4) ?? []

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

      {/* Foto — zona superior derecha del escudo */}
      <div
        className="absolute z-[1] flex items-end justify-center overflow-hidden"
        style={{
          left: `${w * 0.28}px`,
          top: `${h * 0.03}px`,
          width: `${w * 0.7}px`,
          height: `${h * 0.5}px`,
        }}
      >
        <div
          className="pointer-events-none absolute bottom-[8%] h-[55%] w-[55%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(61,230,140,0.22), transparent 68%)',
          }}
        />
        <PlayerCardPhoto
          fotoUrl={player.fotoUrl}
          alt={player.nombre}
          initials={personInitials(player.nombreCorto)}
          variant="shield"
        />
      </div>

      {/* OVR · posición · escudo */}
      <div
        className="absolute z-10 flex flex-col items-center text-center"
        style={{
          top: `${h * 0.1}px`,
          left: `${w * 0.07}px`,
          gap: `${3 * s}px`,
        }}
      >
        <div
          className="font-[family-name:var(--font-anton)] leading-[0.9]"
          style={{
            fontSize: `${44 * s}px`,
            color: PALETTE.num,
            textShadow: `0 0 ${10 * s}px rgba(232,200,120,0.35)`,
          }}
        >
          {ovr ?? '–'}
        </div>
        <div
          className="text-[11px] font-bold tracking-[0.25em]"
          style={{ color: PALETTE.muted }}
        >
          OVR
        </div>
        <div
          className="mt-0.5 rounded-md border px-2 py-px font-[family-name:var(--font-anton)] tracking-wide"
          style={{
            fontSize: `${14 * s}px`,
            borderColor: 'rgba(61,230,140,0.35)',
            background: 'rgba(61,230,140,0.14)',
            color: PALETTE.text,
          }}
        >
          {player.posicion}
        </div>
        <div
          className="my-0.5 h-px w-[26px]"
          style={{ background: `${PALETTE.muted}44` }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={player.escudoUrl}
          alt=""
          className="object-contain drop-shadow-md"
          style={{ width: `${28 * s}px`, height: `${28 * s}px` }}
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
          className="block truncate font-[family-name:var(--font-anton)] uppercase tracking-wide"
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

      {/* Stats 2 columnas */}
      <div
        className="absolute z-10 flex"
        style={{
          top: `${h * 0.625}px`,
          left: `${w * 0.12}px`,
          right: `${w * 0.12}px`,
        }}
      >
        {[0, 1].map((col) => (
          <div
            key={col}
            className="flex flex-1 flex-col items-center"
            style={{
              gap: `${4 * s}px`,
              paddingLeft: col === 1 ? `${8 * s}px` : 0,
              paddingRight: col === 0 ? `${8 * s}px` : 0,
              borderLeft: col === 1 ? `1px solid ${PALETTE.muted}33` : undefined,
            }}
          >
            {STAT_PAIRS.map((pair) => {
              const key = pair[col]
              const value = atributos[key]
              const hot = value !== null && value >= PLAYER_CARD_HOT_THRESHOLD
              return (
                <div
                  key={key}
                  className="flex w-full items-baseline justify-start gap-1.5"
                  style={{ maxWidth: `${72 * s}px` }}
                >
                  <span
                    className="min-w-[22px] font-[family-name:var(--font-anton)]"
                    style={{
                      fontSize: `${18 * s}px`,
                      color: hot ? PALETTE.lines : PALETTE.text,
                    }}
                  >
                    {formatPlayerCardStat(value)}
                  </span>
                  <span
                    className="text-[10px] font-bold tracking-[0.12em]"
                    style={{ color: PALETTE.muted }}
                  >
                    {STAT_LABELS[key]}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Badges recientes */}
      {recentBadges.length > 0 ? (
        <div
          className="absolute z-10 flex justify-center gap-1.5"
          style={{ top: `${h * 0.82}px`, left: 0, right: 0 }}
        >
          {recentBadges.map((badge) => (
            <BadgeDisco
              key={`${badge.iconKey}-${badge.name}`}
              rarity={badge.rarity}
              iconKey={badge.iconKey}
              size="sm"
            />
          ))}
        </div>
      ) : null}

      {/* Pie stats */}
      <div
        className="absolute z-10 flex justify-between"
        style={{
          top: `${h * 0.875}px`,
          left: `${w * 0.1}px`,
          right: `${w * 0.1}px`,
        }}
      >
        {[
          { label: 'Goles 30d', value: String(crudos.goles) },
          { label: 'Asist 30d', value: String(crudos.asistencias) },
          { label: 'Gol/PJ', value: playerCardGolPorPartido(crudos.goles, ventana.pj) },
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 text-center">
            <b
              className="block font-[family-name:var(--font-anton)]"
              style={{ fontSize: `${15 * s}px`, color: PALETTE.num }}
            >
              {value}
            </b>
            <span
              className="text-[8px] font-bold uppercase tracking-[0.12em]"
              style={{ color: PALETTE.muted }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div
        className="absolute z-10 text-center text-[8px] font-bold uppercase tracking-[0.28em]"
        style={{
          bottom: `${h * 0.028}px`,
          left: 0,
          right: 0,
          color: PALETTE.muted,
        }}
      >
        Fútbol de los Lunes · <b style={{ color: PALETTE.text }}>LigaLab</b>
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
