// =============================================================================
// Rate Limiter for Socket.IO Events
// =============================================================================

/**
 * Configuration for a rate limit rule
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Optional: Block duration after limit exceeded (ms). If not set, requests are just rejected */
  blockDurationMs?: number
}

/**
 * Tracks request timestamps for rate limiting
 */
interface RequestTracker {
  timestamps: number[]
  blockedUntil?: number
}

/**
 * Rate limiter that tracks requests per key (socket ID, IP, player ID, etc.)
 */
export class RateLimiter {
  private trackers: Map<string, RequestTracker> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(private config: RateLimitConfig) {
    // Periodically clean up old entries to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Clean up every minute
  }

  /**
   * Check if a request should be allowed
   * @param key Unique identifier (socket ID, IP, etc.)
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now()
    let tracker = this.trackers.get(key)

    if (!tracker) {
      tracker = { timestamps: [] }
      this.trackers.set(key, tracker)
    }

    // Check if blocked
    if (tracker.blockedUntil && now < tracker.blockedUntil) {
      return false
    }

    // Clear block if expired
    if (tracker.blockedUntil && now >= tracker.blockedUntil) {
      tracker.blockedUntil = undefined
      tracker.timestamps = []
    }

    // Remove timestamps outside the window
    const windowStart = now - this.config.windowMs
    tracker.timestamps = tracker.timestamps.filter((ts) => ts > windowStart)

    // Check if limit exceeded
    if (tracker.timestamps.length >= this.config.maxRequests) {
      // Apply block if configured
      if (this.config.blockDurationMs) {
        tracker.blockedUntil = now + this.config.blockDurationMs
      }
      return false
    }

    // Record this request
    tracker.timestamps.push(now)
    return true
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const tracker = this.trackers.get(key)
    if (!tracker) return this.config.maxRequests

    const now = Date.now()
    const windowStart = now - this.config.windowMs
    const recentRequests = tracker.timestamps.filter((ts) => ts > windowStart).length

    return Math.max(0, this.config.maxRequests - recentRequests)
  }

  /**
   * Get time until rate limit resets (in ms)
   */
  getResetTime(key: string): number {
    const tracker = this.trackers.get(key)
    if (!tracker) return 0

    // If blocked, return time until block expires
    if (tracker.blockedUntil) {
      return Math.max(0, tracker.blockedUntil - Date.now())
    }

    // Otherwise return time until oldest timestamp expires
    if (tracker.timestamps.length === 0) return 0

    const oldestTimestamp = Math.min(...tracker.timestamps)
    const resetAt = oldestTimestamp + this.config.windowMs
    return Math.max(0, resetAt - Date.now())
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.trackers.delete(key)
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    for (const [key, tracker] of this.trackers.entries()) {
      // Remove entries with no recent activity
      const hasRecentActivity = tracker.timestamps.some((ts) => ts > windowStart)
      const isBlocked = tracker.blockedUntil && tracker.blockedUntil > now

      if (!hasRecentActivity && !isBlocked) {
        this.trackers.delete(key)
      }
    }
  }

  /**
   * Stop the cleanup interval (call when shutting down)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.trackers.clear()
  }
}

// =============================================================================
// Pre-configured Rate Limiters for Different Actions
// =============================================================================

/**
 * Rate limiter for join attempts
 * - 5 join attempts per 30 seconds per socket
 * - Block for 60 seconds if exceeded
 */
export const joinRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 30000, // 30 seconds
  blockDurationMs: 60000, // 60 second block
})

/**
 * Rate limiter for room creation
 * - 3 room creations per 60 seconds per socket
 * - Block for 120 seconds if exceeded
 */
export const createRoomRateLimiter = new RateLimiter({
  maxRequests: 3,
  windowMs: 60000, // 60 seconds
  blockDurationMs: 120000, // 2 minute block
})

/**
 * Rate limiter for move submissions
 * - 30 moves per 10 seconds per player (generous for fast games)
 * - No block, just reject excess moves
 */
export const moveRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 10000, // 10 seconds
})

/**
 * Rate limiter for reconnection attempts
 * - 10 reconnect attempts per 60 seconds per socket
 * - Block for 30 seconds if exceeded
 */
export const reconnectRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 60 seconds
  blockDurationMs: 30000, // 30 second block
})

/**
 * General rate limiter for misc actions (add AI, remove AI, etc.)
 * - 20 actions per 30 seconds per socket
 */
export const actionRateLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 30000, // 30 seconds
})

/**
 * Cleanup all rate limiters (call on server shutdown)
 */
export function destroyAllRateLimiters(): void {
  joinRateLimiter.destroy()
  createRoomRateLimiter.destroy()
  moveRateLimiter.destroy()
  reconnectRateLimiter.destroy()
  actionRateLimiter.destroy()
}
