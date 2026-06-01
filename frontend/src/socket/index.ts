import { io, type Socket } from 'socket.io-client'

let _socket: Socket | null = null

export function getSocket(): Socket {
  if (!_socket) {
    const token = localStorage.getItem('hv_token')
    _socket = io('http://localhost:3000/chat', {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return _socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  _socket?.disconnect()
  _socket = null
}
