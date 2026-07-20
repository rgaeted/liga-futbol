import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import type { MatchEvent } from '@prisma/client'

export type LiveMatchPayload = {
  matchId: string
  homeScore: number
  awayScore: number
  status: string
  clockStartedAt?: Date | null
  secondHalfStartedAt?: Date | null
  halftimeAt?: Date | null
  event?: MatchEvent
}

declare global {
  // eslint-disable-next-line no-var
  var __socketIo: Server | undefined
}

export function initSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000' },
  })

  io.on('connection', (socket) => {
    socket.on('join-match', (matchId: string) => {
      socket.join(`match:${matchId}`)
    })

    socket.on('leave-match', (matchId: string) => {
      socket.leave(`match:${matchId}`)
    })
  })

  global.__socketIo = io
  return io
}

export function emitMatchUpdate(payload: LiveMatchPayload) {
  global.__socketIo?.to(`match:${payload.matchId}`).emit('match-update', payload)
}
