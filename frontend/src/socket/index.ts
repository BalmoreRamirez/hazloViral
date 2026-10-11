import { io, type Socket } from 'socket.io-client'

let _socket: Socket | null = null
// Token con el que se creó el socket actual
let _socketToken: string | null = null

/**
 * Devuelve el socket del usuario con sesión activa.
 * Si la sesión cambió (logout, login con otra cuenta) se descarta el socket anterior y se crea
 * uno nuevo con el token vigente. Así nunca se reutiliza un socket sin token o de otro usuario.
 */
export function getSocket(): Socket {
  const token = localStorage.getItem('hv_token')
  if (_socket && _socketToken !== token) {
    _socket.disconnect()
    _socket = null
  }
  if (!_socket) {
    _socketToken = token
    _socket = io(`${import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3009'}/chat`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return _socket
}

/** Conecta el socket solo si hay sesión; sin token el servidor rechazaría la conexión. */
export function connectSocket() {
  const s = getSocket()
  if (!s.connected && _socketToken) s.connect()
  return s
}

/** Socket actual sin crear ni conectar uno nuevo (para limpiar listeners al desmontar vistas). */
export function peekSocket(): Socket | null {
  return _socket
}

export function disconnectSocket() {
  _socket?.disconnect()
  _socket = null
  _socketToken = null
}
