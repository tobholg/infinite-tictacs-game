// Web Audio API placeholder sound generators
// These generate simple synthesized sounds for development
// Replace with real sound files for production

export type SoundType =
  | 'buttonClick'
  | 'buttonHover'
  | 'modalOpen'
  | 'modalClose'
  | 'piecePlaced'
  | 'invalidMove'
  | 'boardExpand'
  | 'turnChange'
  | 'winReveal'
  | 'gameWin'
  | 'gameLose'
  | 'gameDraw'
  | 'playerJoin'
  | 'playerLeave'
  | 'countdown'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// Unlock audio context on user interaction (required for mobile)
export function unlockAudioContext(): void {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
}

// Generate a simple sine wave click
function generateClick(duration: number, frequency: number, decay: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * decay)
  }

  return buffer
}

// Generate a low thunk sound
function generateThunk(duration: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Low frequency with quick decay
    data[i] = Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 25) * 0.8
    // Add a bit of higher harmonic
    data[i] += Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t * 40) * 0.2
  }

  return buffer
}

// Generate an error buzz
function generateBuzz(duration: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Square-ish wave for buzzy sound
    const base = Math.sin(2 * Math.PI * 180 * t) > 0 ? 0.5 : -0.5
    data[i] = base * Math.exp(-t * 15) * 0.4
  }

  return buffer
}

// Generate a whoosh sound
function generateWhoosh(duration: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Frequency sweep
    const freq = 400 + 600 * t / duration
    // White noise mixed with sweep
    const noise = (Math.random() * 2 - 1) * 0.3
    const sweep = Math.sin(2 * Math.PI * freq * t) * 0.4
    const envelope = Math.sin(Math.PI * t / duration)
    data[i] = (noise + sweep) * envelope * 0.5
  }

  return buffer
}

// Generate a fanfare (victory sound)
function generateFanfare(duration: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  // C major arpeggio: C4, E4, G4, C5
  const notes = [261.63, 329.63, 392.00, 523.25]
  const noteDuration = duration / notes.length

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const noteIndex = Math.min(Math.floor(t / noteDuration), notes.length - 1)
    const noteT = t - noteIndex * noteDuration
    const freq = notes[noteIndex]
    const envelope = Math.exp(-noteT * 3)
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4
  }

  return buffer
}

// Generate a descending sad tone
function generateDescending(duration: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  // Minor descending: E4, D4, C4
  const notes = [329.63, 293.66, 261.63]
  const noteDuration = duration / notes.length

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const noteIndex = Math.min(Math.floor(t / noteDuration), notes.length - 1)
    const noteT = t - noteIndex * noteDuration
    const freq = notes[noteIndex]
    const envelope = Math.exp(-noteT * 4)
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.35
  }

  return buffer
}

// Generate a neutral ending tone
function generateNeutral(duration: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Two notes in harmony
    const freq1 = 392 // G4
    const freq2 = 329.63 // E4
    const envelope = Math.exp(-t * 3)
    data[i] = (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)) * envelope * 0.25
  }

  return buffer
}

// Generate a chime sound
function generateChime(duration: number, baseFreq: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Bell-like with harmonics
    const fundamental = Math.sin(2 * Math.PI * baseFreq * t)
    const harmonic1 = Math.sin(2 * Math.PI * baseFreq * 2.4 * t) * 0.5
    const harmonic2 = Math.sin(2 * Math.PI * baseFreq * 5.95 * t) * 0.25
    const envelope = Math.exp(-t * 6)
    data[i] = (fundamental + harmonic1 + harmonic2) * envelope * 0.3
  }

  return buffer
}

// Generate a tick sound for countdown
function generateTick(duration: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Sharp attack, quick decay
    const freq = 1200
    const envelope = Math.exp(-t * 60)
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5
  }

  return buffer
}

// Generate a soft notification ping
function generatePing(duration: number): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const length = Math.floor(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const freq = 880 // A5
    const envelope = Math.exp(-t * 12)
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.35
  }

  return buffer
}

// Main function to generate placeholder sound buffer
export function generatePlaceholderSound(type: SoundType): AudioBuffer {
  switch (type) {
    case 'buttonClick':
      return generateClick(0.05, 800, 50)
    case 'buttonHover':
      return generateClick(0.03, 1200, 80)
    case 'modalOpen':
      return generateWhoosh(0.15)
    case 'modalClose':
      return generateWhoosh(0.1)
    case 'piecePlaced':
      return generateThunk(0.1)
    case 'invalidMove':
      return generateBuzz(0.08)
    case 'boardExpand':
      return generateWhoosh(0.2)
    case 'turnChange':
      return generatePing(0.06)
    case 'winReveal':
      return generateChime(0.1, 587.33) // D5
    case 'gameWin':
      return generateFanfare(0.5)
    case 'gameLose':
      return generateDescending(0.4)
    case 'gameDraw':
      return generateNeutral(0.3)
    case 'playerJoin':
      return generateChime(0.15, 523.25) // C5
    case 'playerLeave':
      return generateChime(0.15, 392) // G4
    case 'countdown':
      return generateTick(0.2)
    default:
      return generateClick(0.05, 800, 50)
  }
}

// Play a placeholder sound directly (for testing)
export function playPlaceholderSound(type: SoundType, volume: number = 1): void {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const buffer = generatePlaceholderSound(type)
  const source = ctx.createBufferSource()
  const gainNode = ctx.createGain()

  source.buffer = buffer
  gainNode.gain.value = volume

  source.connect(gainNode)
  gainNode.connect(ctx.destination)
  source.start()
}

// Convert AudioBuffer to base64 data URL for Howler
export function audioBufferToDataUrl(buffer: AudioBuffer): string {
  const ctx = getAudioContext()
  const length = buffer.length
  const channels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate

  // Create WAV file
  const wavBuffer = new ArrayBuffer(44 + length * 2)
  const view = new DataView(wavBuffer)

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length * 2, true)

  // Audio data
  const data = buffer.getChannelData(0)
  let offset = 44
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    offset += 2
  }

  // Convert to base64
  const bytes = new Uint8Array(wavBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return 'data:audio/wav;base64,' + btoa(binary)
}
