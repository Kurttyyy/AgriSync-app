import { createClient } from '@supabase/supabase-js'
import type { DB } from '../domain/types'
import { defaultRiceSeason } from './util'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Database is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the project root .env.local.')
  }
  return supabase
}

export function emptyDatabase(): DB {
  return { farmers: [], plots: [], visits: [], cashAdvances: [], expenses: [], harvests: [], budgets: [] }
}

export async function loadFarmerData(userId: string): Promise<DB | null> {
  const { data, error } = await requireSupabase()
    .from('farmer_data')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const saved = data.data as Partial<DB> | null
  return {
    farmers: Array.isArray(saved?.farmers) ? saved.farmers : [],
    plots: Array.isArray(saved?.plots) ? saved.plots : [],
    visits: Array.isArray(saved?.visits) ? saved.visits : [],
    cashAdvances: Array.isArray(saved?.cashAdvances) ? saved.cashAdvances : [],
    expenses: Array.isArray(saved?.expenses)
      ? saved.expenses.map((expense) => ({
        ...expense,
        season: typeof expense.season === 'string' && expense.season.trim()
          ? expense.season
          : defaultRiceSeason(new Date(expense.date)),
      }))
      : [],
    harvests: Array.isArray(saved?.harvests) ? saved.harvests : [],
    budgets: Array.isArray(saved?.budgets) ? saved.budgets : [],
  }
}

export async function saveFarmerData(userId: string, db: DB): Promise<void> {
  const { error } = await requireSupabase()
    .from('farmer_data')
    .upsert({ user_id: userId, data: db }, { onConflict: 'user_id' })
  if (error) throw error
}
