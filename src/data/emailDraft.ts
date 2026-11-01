import { fmtCashAdvanceDueDate, fmtMoney } from './format'
import type { Farmer, CashAdvance } from '../domain/types'

export function repaidPct(inv: CashAdvance): number {
  const paid = inv.repayments.reduce((sum, r) => sum + r.amount, 0)
  return Math.min(100, Math.round((paid / Math.max(1, inv.principal)) * 100))
}

export function cashAdvanceEmailDraft(inv: CashAdvance, farmer: Farmer): { subject: string; body: string } {
  const pct = repaidPct(inv)
  const subject = `Your "${inv.label}" cash advance — ${pct}% repaid`
  const body =
    `Dear ${farmer.name},\n\n` +
    `Here is your Rice Farm Expenses cash advance update:\n\n` +
    `  Facility: ${inv.label}\n` +
    `  Amount:    ${fmtMoney(inv.principal)}\n` +
    `  Repaid:    ${pct}%\n` +
    `  Due date:  ${fmtCashAdvanceDueDate(inv.dueDate, inv.dueAfterHarvest)}\n\n` +
    'Please contact your farm coordinator if you have questions about this cash advance.'
  return { subject, body }
}