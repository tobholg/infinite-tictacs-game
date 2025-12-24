// =============================================================================
// Socket.IO Client Composable (Singleton)
// =============================================================================

import { ref, readonly } from 'vue'
import { io, Socket } from 'socket.io-client'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../shared/types/events'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Default socket URL - dynamically use current hostname to support network access
function getDefaultSocketUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3011'
  }

  // In production, use same origin (server serves both frontend and socket.io)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin
  }

  // Local dev: use port 3011 for the socket server
  const host = window.location.hostname
  return `http://${host}:3011`
}

// =============================================================================
// Module-level singleton state
// All calls to useSocket() return the same refs, ensuring shared state
// =============================================================================
const socket = ref<TypedSocket | null>(null)
const isConnected = ref(false)
const connectionError = ref<string | null>(null)

/**
 * Composable for managing Socket.IO connection (Singleton)
 * All components share the same socket connection and state.
 */
export function useSocket() {

  /**
   * Connect to the Socket.IO server
   */
  function connect(url?: string): TypedSocket {
    // If already connected, return existing socket
    if (socket.value?.connected) {
      return socket.value
    }

    const socketUrl = url || import.meta.env.VITE_SOCKET_URL || getDefaultSocketUrl()

    console.log(`[Socket] Connecting to ${socketUrl}...`)

    // Create socket connection
    socket.value = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    }) as TypedSocket

    // Connection event handlers
    socket.value.on('connect', () => {
      console.log('[Socket] Connected!')
      isConnected.value = true
      connectionError.value = null
    })

    socket.value.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`)
      isConnected.value = false
    })

    socket.value.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message)
      connectionError.value = error.message
      isConnected.value = false
    })

    return socket.value
  }

  /**
   * Disconnect from the server
   */
  function disconnect(): void {
    if (socket.value) {
      console.log('[Socket] Disconnecting...')
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }

  /**
   * Emit a typed event to the server
   */
  function emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void {
    if (!socket.value) {
      console.warn('[Socket] Cannot emit - not connected')
      return
    }
    socket.value.emit(event, ...args)
  }

  /**
   * Listen to a typed event from the server
   */
  function on<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ): void {
    if (!socket.value) {
      console.warn('[Socket] Cannot listen - not connected')
      return
    }
    socket.value.on(event, handler as any)
  }

  /**
   * Remove a listener for a specific event
   */
  function off<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ): void {
    if (!socket.value) return
    if (handler) {
      socket.value.off(event, handler as any)
    } else {
      socket.value.off(event)
    }
  }

  /**
   * Remove all listeners and disconnect
   * NOTE: This should only be called explicitly when leaving online mode entirely,
   * NOT automatically on component unmount (that would break the singleton pattern)
   */
  function cleanup(): void {
    if (socket.value) {
      socket.value.removeAllListeners()
      disconnect()
    }
  }

  // NOTE: We intentionally do NOT have onUnmounted cleanup here.
  // The socket is a singleton shared across components.
  // cleanup() should only be called explicitly via destroy() in useOnlineGame
  // when the user leaves online mode entirely.

  return {
    socket: readonly(socket),
    isConnected: readonly(isConnected),
    connectionError: readonly(connectionError),
    connect,
    disconnect,
    emit,
    on,
    off,
    cleanup,
  }
}
