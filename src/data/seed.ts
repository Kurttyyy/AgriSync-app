import type { DB } from '../domain/types'

function build(): DB {
  return {
    farmers: [],
    plots: [],
    visits: [],
    cashAdvances: [],
    expenses: [],
  }
}

export const seed = { users: [], db: build() }