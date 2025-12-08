// =============================================================================
// Room Code Generator
// =============================================================================

const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed I, O, 0, 1 to avoid confusion

/**
 * Generates a random room code
 * @param length - Length of the code (default: 6)
 */
export function generateRoomCode(length: number = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length))
  }
  return code
}

/**
 * Generates a unique room code that doesn't exist in the provided set
 * @param existingCodes - Set of existing codes to avoid collisions
 * @param length - Length of the code (default: 6)
 * @param maxAttempts - Maximum attempts before throwing (default: 100)
 */
export function generateUniqueRoomCode(
  existingCodes: Set<string>,
  length: number = 6,
  maxAttempts: number = 100
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateRoomCode(length)
    if (!existingCodes.has(code)) {
      return code
    }
  }
  throw new Error(`Failed to generate unique room code after ${maxAttempts} attempts`)
}

/**
 * Validates a room code format
 * @param code - The code to validate
 * @param length - Expected length (default: 6)
 */
export function isValidRoomCode(code: string, length: number = 6): boolean {
  if (typeof code !== 'string') return false
  if (code.length !== length) return false

  const validCharsRegex = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/
  return validCharsRegex.test(code.toUpperCase())
}
