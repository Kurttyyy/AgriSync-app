import type { DB } from '../domain/types'

function build(): DB {
  return {
    farmers: [],
    plots: [],
    visits: [],
    cashAdvances: [],
    expenses: [],
    harvests: [],
    budgets: [],
  }
}

export const seed = { users: [], db: build() }