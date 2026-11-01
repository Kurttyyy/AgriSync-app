import { getState, setState } from './store'
import type { ChannelId, OutboxItem, SyncLog, SyncOutcome } from '../domain/types'
import { isoNow, uid } from './util'
import { mailConfigured, sendMail } from './mail'
import { syncDatabaseNow } from './store'

export const CHANNELS: Record<ChannelId, { label: string; short: string; desc: string; tone: string }> = {
  'cloud-api': {
    label: 'Rice Farm Expenses Cloud API',
    short: 'Cloud API',
    desc: 'Supabase account data synchronization',
    tone: 'green',
  },
  gmail: {
    label: 'EmailJS',
    short: 'Email',
    desc: 'Email delivery is available only when EmailJS is configured',
    tone: 'brand',
  },
}

function updateItem(id: string, patch: Partial<OutboxItem>): void {
  setState((s) => ({
    outbox: s.outbox.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  }))
}

function logEntry(
  channel: ChannelId,
  items: number,
  synced: number,
  failed: number,
  triggeredBy: SyncLog['triggeredBy'],
): SyncLog {
  const outcome: SyncOutcome = failed === 0 ? 'success' : synced === 0 ? 'failed' : 'partial'
  return {
    id: uid('log'),
    startedAt: isoNow(),
    finishedAt: isoNow(),
    channel,
    items,
    synced,
    failed,
    outcome,
    triggeredBy,
  }
}

export async function runSync(
  triggeredBy: SyncLog['triggeredBy'] = 'manual',
  itemIds?: ReadonlySet<string>,
): Promise<number> {
  if (getState().syncing || !getState().online) return 0
  const pending = getState().outbox.filter((item) =>
    (item.status === 'pending' || item.status === 'failed') && (!itemIds || itemIds.has(item.id)),
  )
  if (pending.length === 0) {
    setState({ syncing: false, syncingPct: 100, lastSyncAt: isoNow() })
    return 0
  }

  setState({ syncing: true, syncingPct: 0 })

  const byChannel = new Map<ChannelId, OutboxItem[]>()
  for (const item of pending) {
    const list = byChannel.get(item.channel) ?? []
    list.push(item)
    byChannel.set(item.channel, list)
  }

  const logs: SyncLog[] = []
  let done = 0
  const total = pending.length

  for (const [channel, items] of byChannel.entries()) {
    let synced = 0
    let failed = 0
    let cloudSyncError: string | undefined
    if (channel === 'cloud-api') {
      try {
        await syncDatabaseNow()
      } catch (error) {
        cloudSyncError = error instanceof Error ? error.message : 'Supabase synchronization failed.'
      }
    }
    for (const item of items) {
      updateItem(item.id, { status: 'syncing', attempts: item.attempts + 1 })
      done += 1
      setState({ syncingPct: Math.round((done / total) * 100) })

      let ok = channel === 'cloud-api' ? !cloudSyncError : false
      let error: string | undefined = cloudSyncError

      if (channel === 'gmail' && item.action === 'notify') {
        const p = item.payload as { recipient?: string; subject?: string; body?: string }
        if (mailConfigured(getState().settings.mail)) {
          try {
            await sendMail(getState().settings.mail, {
              to: p.recipient ?? '',
              subject: p.subject ?? '',
              body: p.body ?? '',
            })
            ok = true
          } catch (err) {
            ok = false
            error = err instanceof Error ? err.message : 'EmailJS delivery failed'
          }
        } else {
          ok = false
          error = 'Email notifications are not configured. Add your EmailJS service ID, template ID, and public key in Settings.'
        }
      }

      if (ok) {
        synced += 1
        const t = isoNow()
        updateItem(item.id, { status: 'synced', syncedAt: t })
      } else {
        failed += 1
        updateItem(item.id, {
          status: 'failed',
          error: error ?? `The ${CHANNELS[channel].short} operation failed. Retry after resolving the error.`,
        })
      }
    }
    logs.push(logEntry(channel, items.length, synced, failed, triggeredBy))
  }

  const retryable = getState().outbox.filter((item) => item.status === 'pending')

  setState({
    syncing: false,
    syncingPct: 100,
    syncLogs: [...getState().syncLogs, ...logs.reverse()],
    lastSyncAt: isoNow(),
    db: getState().db,
  })

  if (getState().settings.autoSync && retryable.length > 0) {
    setTimeout(() => {
      if (getState().online) void runSync('interval', new Set(retryable.map((item) => item.id)))
    }, 2500)
  }

  return syncedCountFromLogs(logs)
}

function syncedCountFromLogs(logs: SyncLog[]): number {
  return logs.reduce((sum, l) => sum + l.synced, 0)
}

export function retryItem(id: string): void {
  updateItem(id, { status: 'pending', error: undefined })
}

export function retryAllFailed(itemIds: ReadonlySet<string>): void {
  setState((s) => ({
    outbox: s.outbox.map((i) =>
      itemIds.has(i.id) && i.status === 'failed'
        ? { ...i, status: 'pending' as const, error: undefined }
        : i,
    ),
  }))
}

export function discardSynced(itemIds: ReadonlySet<string>): void {
  setState((s) => ({
    outbox: s.outbox.filter((item) => !itemIds.has(item.id) || item.status !== 'synced'),
  }))
}