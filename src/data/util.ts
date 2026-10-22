import type { Farmer, Plot } from '../domain/types'

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

export function nextRiceSeason(currentSeason: string, date = new Date()): string {
  const name = currentSeason.trim()
  const yearMatch = name.match(/(\d{4})$/)
  const year = yearMatch ? Number(yearMatch[1]) : date.getFullYear()
  if (/summer/i.test(name)) return name.replace(/summer/i, 'Winter').replace(/\d{4}$/, String(year))
  if (/winter/i.test(name)) return name.replace(/winter/i, 'Summer').replace(/\d{4}$/, String(year + 1))
  if (/dry/i.test(name)) return name.replace(/dry/i, 'Wet').replace(/\d{4}$/, String(year))
  if (/wet/i.test(name)) return name.replace(/wet/i, 'Dry').replace(/\d{4}$/, String(year + 1))
  if (yearMatch) return name.replace(/\d{4}$/, String(year + 1))
  return `${name || 'Rice season'} ${date.getFullYear() + 1}`
}

export function riceSeasonForFarmer(farmer: Farmer | undefined, plots: Plot[], date = new Date()): string {
  if (farmer?.activeSeason?.trim()) return farmer.activeSeason
  const lastSeason = plots.find((plot) => plot.farmerId === farmer?.id)?.season
  return lastSeason?.trim() || defaultRiceSeason(date)
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
