// =============================================================================
// Room State Machine
// =============================================================================

import type { RoomPhase } from '../../../shared/types/index.js'

// Valid state transitions
const VALID_TRANSITIONS: Record<RoomPhase, RoomPhase[]> = {
  LOBBY: ['COUNTDOWN'],
  COUNTDOWN: ['ROUND_ACTIVE', 'LOBBY'], // Can cancel countdown
  ROUND_ACTIVE: ['ROUND_RESULTS'],
  ROUND_RESULTS: ['COUNTDOWN', 'COMPLETED'],
  COMPLETED: ['LOBBY'], // New game
}

/**
 * Room State Machine manages phase transitions
 */
export class RoomStateMachine {
  private phase: RoomPhase = 'LOBBY'

  constructor(initialPhase: RoomPhase = 'LOBBY') {
    this.phase = initialPhase
  }

  /**
   * Get the current phase
   */
  getPhase(): RoomPhase {
    return this.phase
  }

  /**
   * Check if a transition to the given phase is valid
   */
  canTransitionTo(nextPhase: RoomPhase): boolean {
    const validNextPhases = VALID_TRANSITIONS[this.phase]
    return validNextPhases?.includes(nextPhase) ?? false
  }

  /**
   * Attempt to transition to a new phase
   * @returns true if transition was successful, false otherwise
   */
  transition(nextPhase: RoomPhase): boolean {
    if (!this.canTransitionTo(nextPhase)) {
      console.warn(
        `Invalid state transition: ${this.phase} -> ${nextPhase}. ` +
          `Valid transitions: ${VALID_TRANSITIONS[this.phase]?.join(', ')}`
      )
      return false
    }

    console.log(`Room state transition: ${this.phase} -> ${nextPhase}`)
    this.phase = nextPhase
    return true
  }

  /**
   * Force a phase change (use with caution, bypasses validation)
   */
  forcePhase(phase: RoomPhase): void {
    console.warn(`Forcing phase change: ${this.phase} -> ${phase}`)
    this.phase = phase
  }

  /**
   * Reset to LOBBY phase
   */
  reset(): void {
    this.phase = 'LOBBY'
  }

  /**
   * Check if the room is in a playing state (game is active)
   */
  isPlaying(): boolean {
    return this.phase === 'COUNTDOWN' || this.phase === 'ROUND_ACTIVE'
  }

  /**
   * Check if new players can join
   */
  canJoin(): boolean {
    return this.phase === 'LOBBY'
  }

  /**
   * Check if moves can be submitted
   */
  canSubmitMove(): boolean {
    return this.phase === 'ROUND_ACTIVE'
  }
}
