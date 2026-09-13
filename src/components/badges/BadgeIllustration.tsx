'use client'

import { useId, type ReactNode } from 'react'
import { badgeRarityAccent } from '@/components/badges/badge-disco-shared'
import {
  badgeIllustrationVariant,
  type BadgeIllustrationVariant,
} from '@/components/badges/badge-illustration-variants'

type Props = {
  iconKey: string
  rarity?: string
  locked?: boolean
  className?: string
}

const BALL = '#F2F2F2'
const BALL_LINE = '#2A2A2A'

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

function Medal({
  color,
  clipId,
  children,
}: {
  color: string
  clipId: string
  children: ReactNode
}) {
  return (
    <g>
      <circle cx={60} cy={52} r={37} fill="#080808" stroke={color} strokeWidth={3} />
      <circle cx={60} cy={52} r={32} fill="#111111" stroke={color} strokeWidth={0.8} opacity={0.45} />
      <path
        d="M 34 52 A 26 26 0 0 1 86 52"
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        opacity={0.28}
      />
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </g>
  )
}

function VariantArt({
  variant,
  color,
  clipId,
}: {
  variant: BadgeIllustrationVariant
  color: string
  clipId: string
}) {
  switch (variant) {
    case 'clock_ball':
      return (
        <Medal color={color} clipId={clipId}>
          <MotionLines x={38} y={52} color={color} />
          <circle cx={62} cy={52} r={20} fill="#1E1E1E" stroke="#888" strokeWidth={2} />
          <circle cx={62} cy={52} r={2.5} fill={color} />
          <line x1={62} y1={52} x2={62} y2={40} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={62} y1={52} x2={72} y2={56} stroke="#CCC" strokeWidth={2} strokeLinecap="round" />
          <SoccerBall cx={62} cy={52} r={10} />
        </Medal>
      )
    case 'hero_shield':
      return (
        <Medal color={color} clipId={clipId}>
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
        </Medal>
      )
    case 'two_balls':
      return (
        <Medal color={color} clipId={clipId}>
          <MotionLines x={38} y={50} color={color} />
          <SoccerBall cx={50} cy={54} r={9} />
          <SoccerBall cx={70} cy={54} r={9} />
        </Medal>
      )
    case 'three_balls_stars':
      return (
        <Medal color={color} clipId={clipId}>
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
        </Medal>
      )
    case 'four_balls':
      return (
        <Medal color={color} clipId={clipId}>
          <SoccerBall cx={48} cy={50} r={7} />
          <SoccerBall cx={72} cy={50} r={7} />
          <SoccerBall cx={48} cy={66} r={7} />
          <SoccerBall cx={72} cy={66} r={7} />
        </Medal>
      )
    case 'goal_net':
      return (
        <Medal color={color} clipId={clipId}>
          <MotionLines x={36} y={52} color={color} />
          <SoccerBall cx={48} cy={50} r={9} />
          <path
            d="M72 44 V72 M64 48 V72 M80 48 V72 M60 52 H84 M58 58 H86 M56 64 H88 M54 70 H90"
            stroke="#666"
            strokeWidth={1.2}
          />
          <path d="M58 44 H86 V72" fill="none" stroke={color} strokeWidth={1.8} />
        </Medal>
      )
    case 'gloves_cold':
      return (
        <Medal color={color} clipId={clipId}>
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
        </Medal>
      )
    case 'gloves_save':
      return (
        <Medal color={color} clipId={clipId}>
          <path
            d="M42 64 C42 50 48 42 56 42 H64 C72 42 78 50 78 64"
            fill="none"
            stroke="#DDD"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={60} cy={48} r={6} fill={color} opacity={0.35} />
        </Medal>
      )
    case 'wall_shield':
      return (
        <Medal color={color} clipId={clipId}>
          <rect x={40} y={48} width={40} height={22} fill="#222" stroke="#555" strokeWidth={1.5} />
          <line x1={40} y1={54} x2={80} y2={54} stroke="#444" />
          <line x1={52} y1={48} x2={52} y2={70} stroke="#444" />
          <line x1={68} y1={48} x2={68} y2={70} stroke="#444" />
        </Medal>
      )
    case 'single_ball_motion':
      return (
        <Medal color={color} clipId={clipId}>
          <MotionLines x={38} y={54} color={color} />
          <SoccerBall cx={62} cy={54} r={11} />
        </Medal>
      )
    case 'star_burst':
      return (
        <Medal color={color} clipId={clipId}>
          <path
            d="M60 34 L64 46 L76 46 L66 54 L70 66 L60 58 L50 66 L54 54 L44 46 L56 46 Z"
            fill={color}
          />
        </Medal>
      )
    case 'chart_rise':
      return (
        <Medal color={color} clipId={clipId}>
          <polyline
            points="38,64 50,52 58,56 72,40"
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={72} cy={40} r={3} fill={color} />
        </Medal>
      )
    case 'linked_nodes':
      return (
        <Medal color={color} clipId={clipId}>
          <circle cx={46} cy={50} r={7} fill="#222" stroke={color} strokeWidth={2} />
          <circle cx={74} cy={58} r={7} fill="#222" stroke={color} strokeWidth={2} />
          <line x1={52} y1={52} x2={68} y2={56} stroke={color} strokeWidth={2} />
        </Medal>
      )
    case 'boot_pass':
      return (
        <Medal color={color} clipId={clipId}>
          <MotionLines x={36} y={56} color={color} />
          <path
            d="M48 62 L58 58 L62 64 L52 68 Z"
            fill="#333"
            stroke={color}
            strokeWidth={1.5}
          />
          <SoccerBall cx={72} cy={52} r={8} />
        </Medal>
      )
    case 'calendar_check':
      return (
        <Medal color={color} clipId={clipId}>
          <rect x={42} y={42} width={36} height={30} rx={3} fill="#1A1A1A" stroke={color} strokeWidth={1.8} />
          <line x1={42} y1={50} x2={78} y2={50} stroke={color} strokeWidth={1.5} />
          <path d="M52 60 L58 66 L70 52" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Medal>
      )
    case 'rain_boot':
      return (
        <Medal color={color} clipId={clipId}>
          <path d="M44 40 Q60 28 76 40" fill="none" stroke="#888" strokeWidth={2} />
          <line x1={50} y1={44} x2={48} y2={52} stroke={color} strokeWidth={2} />
          <line x1={60} y1={42} x2={60} y2={50} stroke={color} strokeWidth={2} />
          <line x1={70} y1={44} x2={72} y2={52} stroke={color} strokeWidth={2} />
          <ellipse cx={60} cy={64} rx={14} ry={6} fill="#333" stroke={color} strokeWidth={1.5} />
        </Medal>
      )
    case 'yellow_card':
      return (
        <Medal color={color} clipId={clipId}>
          <rect x={48} y={40} width={24} height={32} rx={2} fill="#E8C878" stroke={color} strokeWidth={1.5} />
        </Medal>
      )
    case 'autogoal':
      return (
        <Medal color={color} clipId={clipId}>
          <SoccerBall cx={60} cy={52} r={10} />
          <path d="M48 64 L72 40" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M72 64 L48 40" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Medal>
      )
    case 'medal_club':
      return (
        <Medal color={color} clipId={clipId}>
          <circle cx={60} cy={52} r={16} fill="#1A1A1A" stroke={color} strokeWidth={2} />
          <path
            d="M60 42 L63 50 L72 50 L65 55 L68 64 L60 59 L52 64 L55 55 L48 50 L57 50 Z"
            fill={color}
            opacity={0.85}
          />
        </Medal>
      )
    case 'number_fifty':
      return (
        <Medal color={color} clipId={clipId}>
          <text x={60} y={58} textAnchor="middle" fill={color} fontSize={22} fontWeight={800}>
            50
          </text>
        </Medal>
      )
    case 'first_arrow':
      return (
        <Medal color={color} clipId={clipId}>
          <SoccerBall cx={52} cy={54} r={9} />
          <path d="M66 54 H78 M74 50 L78 54 L74 58" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Medal>
      )
    case 'comeback_hand':
      return (
        <Medal color={color} clipId={clipId}>
          <path
            d="M48 58 C48 48 54 42 60 42 C66 42 72 48 72 58"
            fill="none"
            stroke={color}
            strokeWidth={2.5}
          />
          <path d="M60 58 V66 M56 62 H64" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Medal>
      )
    case 'fire_streak':
      return (
        <Medal color={color} clipId={clipId}>
          <path
            d="M60 66 C52 60 50 52 56 46 C54 54 58 56 60 50 C62 56 66 54 64 46 C70 52 68 60 60 66 Z"
            fill={color}
          />
        </Medal>
      )
    default:
      return (
        <Medal color={color} clipId={clipId}>
          <SoccerBall cx={60} cy={54} r={12} />
        </Medal>
      )
  }
}

export function BadgeIllustration({
  iconKey,
  rarity = 'comun',
  locked = false,
  className = '',
}: Props) {
  const glowId = useId()
  const clipId = useId()
  const variant = badgeIllustrationVariant(iconKey)
  const color = badgeRarityAccent(rarity, locked)

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
        <clipPath id={clipId}>
          <circle cx={60} cy={52} r={30} />
        </clipPath>
      </defs>
      <ellipse cx={60} cy={52} rx={40} ry={40} fill={`url(#${glowId})`} />
      <VariantArt variant={variant} color={color} clipId={clipId} />
    </svg>
  )
}
