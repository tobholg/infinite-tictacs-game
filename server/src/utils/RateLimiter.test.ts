import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter } from './RateLimiter.js'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  afterEach(() => {
    limiter?.destroy()
  })

  describe('basic rate limiting', () => {
    beforeEach(() => {
      limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 1000, // 1 second
      })
    })

    it('should allow requests under the limit', () => {
      expect(limiter.isAllowed('user1')).toBe(true)
      expect(limiter.isAllowed('user1')).toBe(true)
      expect(limiter.isAllowed('user1')).toBe(true)
    })

    it('should reject requests over the limit', () => {
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')
      expect(limiter.isAllowed('user1')).toBe(false)
    })

    it('should track different keys separately', () => {
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')
      expect(limiter.isAllowed('user1')).toBe(false)
      expect(limiter.isAllowed('user2')).toBe(true)
    })

    it('should return correct remaining requests', () => {
      expect(limiter.getRemaining('user1')).toBe(3)
      limiter.isAllowed('user1')
      expect(limiter.getRemaining('user1')).toBe(2)
      limiter.isAllowed('user1')
      expect(limiter.getRemaining('user1')).toBe(1)
      limiter.isAllowed('user1')
      expect(limiter.getRemaining('user1')).toBe(0)
    })
  })

  describe('sliding window', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should reset after window expires', () => {
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')
      expect(limiter.isAllowed('user1')).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(1100)

      expect(limiter.isAllowed('user1')).toBe(true)
    })

    it('should use sliding window (not fixed window)', () => {
      limiter.isAllowed('user1') // t=0
      vi.advanceTimersByTime(500)
      limiter.isAllowed('user1') // t=500ms
      expect(limiter.isAllowed('user1')).toBe(false) // at limit

      // After 600ms total (500 + 600 = 1100), first request expired
      vi.advanceTimersByTime(600)
      expect(limiter.isAllowed('user1')).toBe(true) // first request expired
    })
  })

  describe('blocking', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
        blockDurationMs: 5000,
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should block user after exceeding limit', () => {
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')
      expect(limiter.isAllowed('user1')).toBe(false) // triggers block

      // Still blocked even after window resets
      vi.advanceTimersByTime(2000)
      expect(limiter.isAllowed('user1')).toBe(false)

      // Unblocked after block duration
      vi.advanceTimersByTime(4000) // 6 seconds total
      expect(limiter.isAllowed('user1')).toBe(true)
    })

    it('should return correct reset time when blocked', () => {
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')
      limiter.isAllowed('user1') // triggers block

      const resetTime = limiter.getResetTime('user1')
      expect(resetTime).toBeGreaterThan(4000)
      expect(resetTime).toBeLessThanOrEqual(5000)
    })
  })

  describe('reset', () => {
    beforeEach(() => {
      limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
        blockDurationMs: 5000,
      })
    })

    it('should reset rate limit for a key', () => {
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')
      expect(limiter.isAllowed('user1')).toBe(false)

      limiter.reset('user1')

      expect(limiter.isAllowed('user1')).toBe(true)
      expect(limiter.getRemaining('user1')).toBe(1) // after 1 request
    })
  })

  describe('getResetTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 10000,
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return 0 for unknown keys', () => {
      expect(limiter.getResetTime('unknown')).toBe(0)
    })

    it('should return time until oldest request expires', () => {
      limiter.isAllowed('user1')
      vi.advanceTimersByTime(2000)
      limiter.isAllowed('user1')

      const resetTime = limiter.getResetTime('user1')
      // Oldest is at t=0, expires at t=10000, we're at t=2000
      expect(resetTime).toBeGreaterThan(7000)
      expect(resetTime).toBeLessThanOrEqual(8000)
    })
  })
})
