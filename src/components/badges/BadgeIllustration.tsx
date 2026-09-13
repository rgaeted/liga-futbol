'use client'

import { useId, type ReactNode } from 'react'
import {
  badgeIllustrationVariant,
  type BadgeIllustrationVariant,
} from '@/components/badges/badge-illustration-variants'

type Props = {
  iconKey: string
  locked?: boolean
  className?: string
}

const ORANGE = '#FF6B1A'
const ORANGE_DIM = '#8B4518'
const BALL = '#F2F2F2'
const BALL_LINE = '#2A2A2A'

function accent(locked: boolean) {
  return locked ? ORANGE_DIM : ORANGE
}

function SoccerBall({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={BALL} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={BALL_LINE} strokeWidth={r * 0.08} />
      <path
        d={`M${cx} ${cy - r * 0.55} L${cx + r * 0.25} ${cy - r * 0.15} L${cx + r * 0.15} ${cy + r * 0.35} L${cx - r * 0.15} ${cy + r * 0.35} L${cx - r * 0.25} ${cy - r * 0.15} Z`}
        fill={BALL_LINE}
        opacity={0.85}
      />
    </g>
  )
}

function MotionLines({
  x,
  y,
  color,
  flip,
}: {
  x: number
  y: number
  color: string
  flip?: boolean
}) {
  const dir = flip ? 1 : -1
  return (
    <g stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.9}>
      <line x1={x} y1={y} x2={x + dir * 14} y2={y} />
      <line x1={x + dir * 4} y1={y - 6} x2={x + dir * 18} y2={y - 6} />
      <line x1={x + dir * 2} y1={y + 6} x2={x + dir * 16} y2={y + 6} />
    </g>
  )
}

function Shield({ color, children }: { color: string; children: ReactNode }) {
  return (
    <g>
      <path
        d="M60 14 L92 26 L92 58 Q92 76 60 88 Q28 76 28 58 L28 26 Z"
        fill="#121212"
        stroke={color}
        strokeWidth={2.2}
      />
      <path
        d="M60 18 L88 28 L88 57 Q88 72 60 82 Q32 72 32 57 L32 28 Z"
        fill="#0A0A0A"
        opacity={0.55}
      />
      {children}
    </g>
  )
}

function VariantArt({
  variant,
  color,
}: {
  variant: BadgeIllustrationVariant
  color: string
}) {
  switch (variant) {
    case 'clock_ball':
      return (
        <>
          <MotionLines x={34} y={52} color={color} />
          <circle cx={68} cy={52} r={22} fill="#1E1E1E" stroke="#888" strokeWidth={2} />
          <circle cx={68} cy={52} r={2.5} fill={color} />
          <line x1={68} y1={52} x2={68} y2={40} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={68} y1={52} x2={78} y2={56} stroke="#CCC" strokeWidth={2} strokeLinecap="round" />
          <SoccerBall cx={68} cy={52} r={11} />
        </>
      )
    case 'hero_shield':
      return (
        <Shield color={color}>
          <circle cx={60} cy={42} r={18} fill={color} opacity={0.22} />
          <path
            d="M60 34 L54 48 L48 50 L52 58 L51 66 L60 62 L69 66 L68 58 L72 50 L66 48 Z"
            fill="#111"
            stroke={color}
            strokeWidth={1.5}
          />
          <text x={60} y={52} textAnchor="middle" fill={color} fontSize={11} fontWeight={700}>
            10
          </text>
        </Shield>
      )
    case 'two_balls':
      return (
        <Shield color={color}>
          <MotionLines x={38} y={50} color={color} />
          <SoccerBall cx={50} cy={54} r={9} />
          <SoccerBall cx={70} cy={54} r={9} />
        </Shield>
      )
    case 'three_balls_stars':
      return (
        <Shield color={color}>
          {[44, 60, 76].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${30 - i} L${x + 2} ${36 - i} L${x + 8} ${36 - i} L${x + 3} ${40 - i} L${x + 5} ${46 - i} L${x} ${42 - i} L${x - 5} ${46 - i} L${x - 3} ${40 - i} L${x - 8} ${36 - i} L${x - 2} ${36 - i} Z`}
              fill={color}
            />
          ))}
          <SoccerBall cx={44} cy={58} r={7} />
          <SoccerBall cx={60} cy={54} r={9} />
          <SoccerBall cx={76} cy={58} r={7} />
        </Shield>
      )
    case 'four_balls':
      return (
        <Shield color={color}>
          <SoccerBall cx={48} cy={50} r={7} />
          <SoccerBall cx={72} cy={50} r={7} />
          <SoccerBall cx={48} cy={66} r={7} />
          <SoccerBall cx={72} cy={66} r={7} />
        </Shield>
      )
    case 'goal_net':
      return (
        <Shield color={color}>
          <MotionLines x={36} y={52} color={color} />
          <SoccerBall cx={48} cy={50} r={9} />
          <path
            d="M72 44 V72 M64 48 V72 M80 48 V72 M60 52 H84 M58 58 H86 M56 64 H88 M54 70 H90"
            stroke="#666"
            strokeWidth={1.2}
          />
          <path d="M58 44 H86 V72" fill="none" stroke={color} strokeWidth={1.8} />
        </Shield>
      )
    case 'gloves_cold':
      return (
        <Shield color={color}>
          <path
            d="M44 62 C44 52 48 46 52 46 C54 46 55 48 55 50 V58 C55 62 52 66 48 66 C45 66 44 64 44 62 Z"
            fill="#E8E8E8"
            stroke="#AAA"
            strokeWidth={1.2}
          />
          <path
            d="M76 62 C76 52 72 46 68 46 C66 46 65 48 65 50 V58 C65 62 68 66 72 66 C75 66 76 64 76 62 Z"
            fill="#E8E8E8"
            stroke="#AAA"
            strokeWidth={1.2}
          />
          <path
            d="M60 38 L62 44 L68 44 L63 48 L65 54 L60 50 L55 54 L57 48 L52 44 L58 44 Z"
            fill="none"
            stroke={color}
            strokeWidth={1.8}
          />
        </Shield>
      )
    case 'gloves_save':
      return (
        <Shield color={color}>
          <path
            d="M42 64 C42 50 48 42 56 42 H64 C72 42 78 50 78 64"
            fill="none"
            stroke="#DDD"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={60} cy={48} r={6} fill={color} opacity={0.35} />
        </Shield>
      )
    case 'wall_shield':
      return (
        <Shield color={color}>
          <rect x={40} y={48} width={40} height={22} fill="#222" stroke="#555" strokeWidth={1.5} />
          <line x1={40} y1={54} x2={80} y2={54} stroke="#444" />
          <line x1={52} y1={48} x2={52} y2={70} stroke="#444" />
          <line x1={68} y1={48} x2={68} y2={70} stroke="#444" />
        </Shield>
      )
    case 'single_ball_motion':
      return (
        <Shield color={color}>
          <MotionLines x={38} y={54} color={color} />
          <SoccerBall cx={62} cy={54} r={11} />
        </Shield>
      )
    case 'star_burst':
      return (
        <Shield color={color}>
          <path
            d="M60 34 L64 46 L76 46 L66 54 L70 66 L60 58 L50 66 L54 54 L44 46 L56 46 Z"
            fill={color}
          />
        </Shield>
      )
    case 'chart_rise':
      return (
        <Shield color={color}>
          <polyline
            points="38,64 50,52 58,56 72,40"
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={72} cy={40} r={3} fill={color} />
        </Shield>
      )
    case 'linked_nodes':
      return (
        <Shield color={color}>
          <circle cx={46} cy={50} r={7} fill="#222" stroke={color} strokeWidth={2} />
          <circle cx={74} cy={58} r={7} fill="#222" stroke={color} strokeWidth={2} />
          <line x1={52} y1={52} x2={68} y2={56} stroke={color} strokeWidth={2} />
        </Shield>
      )
    case 'boot_pass':
      return (
        <Shield color={color}>
          <MotionLines x={36} y={56} color={color} />
          <path
            d="M48 62 L58 58 L62 64 L52 68 Z"
            fill="#333"
            stroke={color}
            strokeWidth={1.5}
          />
          <SoccerBall cx={72} cy={52} r={8} />
        </Shield>
      )
    case 'calendar_check':
      return (
        <Shield color={color}>
          <rect x={42} y={42} width={36} height={30} rx={3} fill="#1A1A1A" stroke={color} strokeWidth={1.8} />
          <line x1={42} y1={50} x2={78} y2={50} stroke={color} strokeWidth={1.5} />
          <path d="M52 60 L58 66 L70 52" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Shield>
      )
    case 'rain_boot':
      return (
        <Shield color={color}>
          <path d="M44 40 Q60 28 76 40" fill="none" stroke="#888" strokeWidth={2} />
          <line x1={50} y1={44} x2={48} y2={52} stroke={color} strokeWidth={2} />
          <line x1={60} y1={42} x2={60} y2={50} stroke={color} strokeWidth={2} />
          <line x1={70} y1={44} x2={72} y2={52} stroke={color} strokeWidth={2} />
          <ellipse cx={60} cy={64} rx={14} ry={6} fill="#333" stroke={color} strokeWidth={1.5} />
        </Shield>
      )
    case 'yellow_card':
      return (
        <Shield color={color}>
          <rect x={48} y={40} width={24} height={32} rx={2} fill="#E8C878" stroke={color} strokeWidth={1.5} />
        </Shield>
      )
    case 'autogoal':
      return (
        <Shield color={color}>
          <SoccerBall cx={60} cy={52} r={10} />
          <path d="M48 64 L72 40" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M72 64 L48 40" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Shield>
      )
    case 'medal_club':
      return (
        <Shield color={color}>
          <circle cx={60} cy={52} r={16} fill="#1A1A1A" stroke={color} strokeWidth={2} />
          <path
            d="M60 42 L63 50 L72 50 L65 55 L68 64 L60 59 L52 64 L55 55 L48 50 L57 50 Z"
            fill={color}
            opacity={0.85}
          />
        </Shield>
      )
    case 'number_fifty':
      return (
        <Shield color={color}>
          <text x={60} y={58} textAnchor="middle" fill={color} fontSize={22} fontWeight={800}>
            50
          </text>
        </Shield>
      )
    case 'first_arrow':
      return (
        <Shield color={color}>
          <SoccerBall cx={52} cy={54} r={9} />
          <path d="M66 54 H78 M74 50 L78 54 L74 58" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Shield>
      )
    case 'comeback_hand':
      return (
        <Shield color={color}>
          <path
            d="M48 58 C48 48 54 42 60 42 C66 42 72 48 72 58"
            fill="none"
            stroke={color}
            strokeWidth={2.5}
          />
          <path d="M60 58 V66 M56 62 H64" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Shield>
      )
    case 'fire_streak':
      return (
        <Shield color={color}>
          <path
            d="M60 66 C52 60 50 52 56 46 C54 54 58 56 60 50 C62 56 66 54 64 46 C70 52 68 60 60 66 Z"
            fill={color}
          />
        </Shield>
      )
    default:
      return (
        <Shield color={color}>
          <SoccerBall cx={60} cy={54} r={12} />
        </Shield>
      )
  }
}

export function BadgeIllustration({ iconKey, locked = false, className = '' }: Props) {
  const glowId = useId()
  const variant = badgeIllustrationVariant(iconKey)
  const color = accent(locked)

  return (
    <svg
      viewBox="0 0 120 96"
      className={className}
      aria-hidden
      role="img"
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity={locked ? 0.08 : 0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={60} cy={54} rx={42} ry={32} fill={`url(#${glowId})`} />
      <VariantArt variant={variant} color={color} />
    </svg>
  )
}
