let counter = 0

export function uid(prefix: string): string {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${rand}-${counter}`
}

export function isoNow(): string {
  return new Date().toISOString()
}

export function defaultRiceSeason(date = new Date()): string {
  const year = Number.isFinite(date.getTime()) ? date.getFullYear() : new Date().getFullYear()
  return `Main season ${year}`
}

export function ussdCode(id: string): string {
  const seed = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return `*134*${1000 + (seed % 9000)}#`
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}