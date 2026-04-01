/**
 * Revision Code Increment Utility
 *
 * Handles alphabetic revision code sequences for document control:
 * A → B → C → ... → Z → AA → AB → ... → AZ → BA → ...
 *
 * STRICT RULES:
 * - Single letter codes: A-Z (26 revisions)
 * - Double letter codes: AA-ZZ (676 revisions)
 * - If somehow we exceed ZZ, throw error (extremely rare in practice)
 *
 * Examples:
 * - incrementRevisionCode("A") → "B"
 * - incrementRevisionCode("Z") → "AA"
 * - incrementRevisionCode("AA") → "AB"
 * - incrementRevisionCode("AZ") → "BA"
 * - incrementRevisionCode("ZZ") → throws error (676+ revisions not supported)
 */

/**
 * Get the next revision code in sequence
 * @param currentCode Current revision code (e.g., "A", "B", "Z", "AA")
 * @returns Next revision code
 * @throws Error if currentCode is invalid or exceeds ZZ
 */
export function incrementRevisionCode(currentCode: string): string {
  if (!currentCode || typeof currentCode !== 'string') {
    throw new Error('Invalid revision code: must be a non-empty string')
  }

  const code = currentCode.trim().toUpperCase()

  // Validate format: only A-Z characters
  if (!/^[A-Z]+$/.test(code)) {
    throw new Error(`Invalid revision code format: "${currentCode}". Must contain only A-Z.`)
  }

  // Single letter: A-Z
  if (code.length === 1) {
    const charCode = code.charCodeAt(0)
    if (charCode < 65 || charCode > 90) {
      throw new Error(`Invalid revision code: "${currentCode}"`)
    }

    // Z → AA (rollover to double letters)
    if (charCode === 90) {
      return 'AA'
    }

    // A-Y → next letter
    return String.fromCharCode(charCode + 1)
  }

  // Double letter: AA-ZZ
  if (code.length === 2) {
    const firstChar = code.charCodeAt(0)
    const secondChar = code.charCodeAt(1)

    // Validate both are A-Z
    if (firstChar < 65 || firstChar > 90 || secondChar < 65 || secondChar > 90) {
      throw new Error(`Invalid revision code: "${currentCode}"`)
    }

    // Second letter not Z: increment second letter
    // e.g., AA → AB, AB → AC
    if (secondChar < 90) {
      return String.fromCharCode(firstChar) + String.fromCharCode(secondChar + 1)
    }

    // Second letter is Z, first letter not Z: rollover second, increment first
    // e.g., AZ → BA, BZ → CA
    if (firstChar < 90) {
      return String.fromCharCode(firstChar + 1) + 'A'
    }

    // Both Z: exceeded maximum (ZZ is 676th revision)
    // In practice, documents rarely exceed 26 revisions, let alone 676
    throw new Error(
      `Revision code limit exceeded: "${currentCode}" is the maximum. ` +
        `Consider starting a new document series.`
    )
  }

  // Codes longer than 2 letters not supported
  throw new Error(
    `Unsupported revision code length: "${currentCode}". ` +
      `Only single (A-Z) and double (AA-ZZ) letter codes are supported.`
  )
}

/**
 * Validate if a revision code is valid
 * @param code Revision code to validate
 * @returns true if valid, false otherwise
 */
export function isValidRevisionCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false
  }

  const trimmed = code.trim().toUpperCase()

  // Must be 1-2 uppercase letters
  if (!/^[A-Z]{1,2}$/.test(trimmed)) {
    return false
  }

  return true
}

/**
 * Get the initial revision code for a new document
 * @returns "A" - the starting revision
 */
export function getInitialRevisionCode(): string {
  return 'A'
}
