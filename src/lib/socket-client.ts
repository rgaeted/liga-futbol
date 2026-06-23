'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? '', {
      autoConnect: false,
    })
  }
  return socket
}

export function joinMatchRoom(matchId: string) {
  const s = getSocket()
  if (!s.connected) s.connect()
  s.emit('join-match', matchId)
}
