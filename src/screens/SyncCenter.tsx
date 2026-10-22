import { useRef, type ChangeEvent } from 'react'
import { useAppState, replaceAccountDatabase, syncDatabaseNow } from '../data/store'
import { CHANNELS, discardSynced, retryAllFailed, retryItem, runSync } from '../data/sync'
import { dbForUser, outboxForUser } from '../data/selectors'
import { fmtRelative, fmtTimeOfDay } from '../data/format'
import { Chip, confirmDialog, statusTone, toast } from '../components/kit'
import { IconCheck, IconClock, IconCloudOff, IconMail, IconRefresh, IconSync, IconTrash } from '../components/icons'
import type { OutboxItem, SyncLog } from '../domain/types'
import { makeAccountBackup, parseAccountBackup } from '../data/backup'

const ENTITY_LABEL: Record<OutboxItem['entity'], string> = {
  farmer: 'Farmer profile',
  plot: 'Plot record',
  visit: 'Field visit',
  cashAdvance: 'Cash advance record',
  expense: 'Farm expense',
  sms: 'SMS to farmer',
  email: 'Email to farmer',
}

export default function SyncCenter() {
  const backupPicker = useRef<HTMLInputElement>(null)
  const user = useAppState((s) => s.auth.user)
  const allDb = useAppState((s) => s.db)
  const db = dbForUser(allDb, user)
  const allOutbox = useAppState((s) => s.outbox)
  const outbox = outboxForUser(allOutbox, db)
  const logs = useAppState((s) => s.syncLogs)
  const syncing = useAppState((s) => s.syncing)
  const pct = useAppState((s) => s.syncingPct)
  const online = useAppState((s) => s.online)
  const lastSync = useAppState((s) => s.lastSyncAt)
  const databaseSaveStatus = useAppState((s) => s.databaseSaveStatus)
  const databaseSavedAt = useAppState((s) => s.databaseSavedAt)
  const databaseSaveError = useAppState((s) => s.databaseSaveError)

  const pending = outbox.filter((o) => o.status === 'pending')
  const failed = outbox.filter((o) => o.status === 'failed')
  const synced = outbox.filter((o) => o.status === 'synced')
  const queue = [...outbox]
    .filter((o) => o.status !== 'synced')
  const activeCount = pending.length + failed.length
  const history = [...logs].reverse()

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Backup file is larger than the 10 MB limit.')
      const input: unknown = JSON.parse(await file.text())
      const allowedIds = new Set(user?.farmerIds?.length ? user.farmerIds : user?.farmerId ? [user.farmerId] : [])
      const restoredDb = parseAccountBackup(input, allowedIds)
      confirmDialog(
        'Restore account backup?',
        'This replaces the current records for your signed-in account with the contents of the backup.',
        () => {
          void replaceAccountDatabase(restoredDb).then(() => {
            toast(online ? 'Backup restored and saved to Supabase.' : 'Backup restored on this device; it will sync when online.')
          }).catch((error: unknown) => {
            toast(error instanceof Error ? error.message : 'Unable to restore the backup.', 'alert')
          })
        },
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to read this backup file.', 'alert')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb">Account data and delivery tools</div>
          <h1 className="mt-2">Sync Center</h1>
          <p className="text-sm mt-2">Account records sync directly with Supabase. Message-channel processing below is only a simulator.</p>
        </div>
        <span className={`chip ${online ? 'tone-green' : 'tone-amber'}`}>
          <span className="dot" />
          {online ? 'Connected' : 'Offline'}
        </span>
      </div>

      <section className="card sync-status">
        <span className={`ring ${failed.length > 0 ? 'warn' : syncing ? 'pulse' : 'ok'}`}>
          {failed.length > 0 ? (
            <IconCloudOff width={24} height={24} />
          ) : syncing ? (
            <IconSync className="spin" width={24} height={24} />
          ) : (
            <IconCheck width={24} height={24} />
          )}
        </span>
        <div className="grow">
          <h2 style={{ fontSize: 16 }}>
            {failed.length > 0
              ? `${failed.length} item${failed.length === 1 ? '' : 's'} need attention`
              : syncing
                ? `Processing… ${pct}%`
                : activeCount > 0
                  ? `${activeCount} item${activeCount === 1 ? '' : 's'} waiting to be processed`
                  : 'Outbox clear'}
          </h2>
          <p className="text-sm text-mute mt-2">
            {online
              ? lastSync ? `Last local processing run ${fmtRelative(lastSync)}.` : 'No records have been processed yet.'
              : 'No network — work stays queued on this device.'}
          </p>
          {syncing && <div className="progress mt-3"><span style={{ width: `${pct}%` }} /></div>}
        </div>
      </section>

      <section className="card mt-4">
        <div className="card-row">
          <div>
            <h2 className="card-title">Supabase account sync</h2>
            <p className="text-sm text-mute mt-2">
              {databaseSaveStatus === 'saving'
                ? 'Saving your latest account data…'
                : databaseSaveStatus === 'pending'
                  ? online ? 'Your changes are waiting to sync.' : 'Offline: your changes are saved on this device and waiting for a connection.'
                  : databaseSaveStatus === 'error'
                    ? databaseSaveError ?? 'The last database save failed.'
                    : databaseSavedAt ? `Last saved ${fmtRelative(databaseSavedAt)}.` : 'Connect to verify the latest database save.'}
            </p>
          </div>
          <Chip tone={databaseSaveStatus === 'error' ? 'tone-red' : databaseSaveStatus === 'saved' && online ? 'tone-green' : 'tone-amber'}>
            {databaseSaveStatus === 'saving' ? 'Saving' : databaseSaveStatus === 'error' ? 'Save failed' : databaseSaveStatus === 'pending' ? 'Pending' : online ? 'Saved' : 'Offline'}
          </Chip>
        </div>
        {databaseSaveError && <div className="login-error mt-3" role="alert"><span className="dot" />{databaseSaveError}</div>}
        <div className="flex gap-md wrap mt-3">
          <button
            className="btn btn-primary btn-sm"
            disabled={!online || databaseSaveStatus === 'saving'}
            onClick={() => {
              void syncDatabaseNow().catch(() => undefined)
            }}
          >
            <IconRefresh width={15} height={15} /> Sync account records
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadBackup(db)}>
            Download account backup
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => backupPicker.current?.click()}>
            Restore backup
          </button>
          <input ref={backupPicker} type="file" accept="application/json,.json" hidden onChange={(event) => void importBackup(event)} />
        </div>
        <p className="text-xs text-mute mt-3">Backups contain private farm records. Store the downloaded file securely. Restoring replaces current account data.</p>
      </section>

      <div className="flex gap-md mt-4 wrap">
        <button
          className="btn btn-primary grow"
          disabled={syncing || activeCount === 0}
          onClick={() => {
            if (!online) {
              toast('Connect to the network to process queued records', 'alert')
              return
            }
            void runSync('manual', new Set(outbox.map((item) => item.id))).then((n) =>
              toast(n > 0 ? `${n} record${n === 1 ? '' : 's'} processed by the simulator` : 'Nothing to process'),
            )
          }}
        >
          {syncing ? <IconSync className="spin" width={16} height={16} /> : <IconSync width={16} height={16} />}
          {syncing ? 'Processing…' : `Process ${activeCount > 0 ? activeCount : 'queue'}`}
        </button>
        <button
          className="btn btn-ghost"
          disabled={failed.length === 0}
          onClick={() => retryAllFailed(new Set(failed.map((item) => item.id)))}
        >
          <IconRefresh width={15} height={15} /> Retry failed
        </button>
        <button
          className="btn btn-soft"
          disabled={synced.length === 0}
          onClick={() => {
            discardSynced(new Set(synced.map((item) => item.id)))
            toast('Your processed queue history was cleared from this device')
          }}
        >
          <IconTrash width={15} height={15} /> Clear processed
        </button>
      </div>

      {queue.length > 0 && (
        <section className="card mt-5">
          <div className="card-row">
            <span className="card-title">Simulated message-channel queue</span>
            <span className="text-mute text-sm">{queue.length} on device</span>
          </div>
          {queue.map((o) => (
            <div className="outbox-row" key={o.id}>
              <span className={`feed-icon ${o.status === 'failed' ? '' : ''}`} style={o.status === 'failed' ? { color: 'var(--red)', background: 'var(--red-soft)' } : {}}>
                {o.status === 'failed' ? <IconCloudOff width={16} height={16} /> : o.status === 'syncing' ? <IconSync className="spin" width={16} height={16} /> : <IconClock width={16} height={16} />}
              </span>
              <div className="grow">
                <div className="row-title" style={{ fontSize: 13.5 }}>
                  {ENTITY_LABEL[o.entity]} {o.action === 'update' ? '· update' : ''}
                </div>
                <div className="row-sub mono">
                  {o.entityId}
                  {o.error && <span style={{ color: 'var(--red)', display: 'block' }}>{o.error}</span>}
                </div>
              </div>
              <Chip tone={statusTone(o.status)}>{o.status === 'synced' ? 'processed' : o.status}</Chip>
              <Chip tone="tone-brand">{CHANNELS[o.channel].short}</Chip>
              <span className="text-xs text-mute" style={{ whiteSpace: 'nowrap' }}>{fmtRelative(o.createdAt)}</span>
              {o.status === 'failed' && (
                <button className="btn btn-sm btn-ghost" onClick={() => retryItem(o.id)}>
                  <IconRefresh width={14} height={14} /> Retry
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="seg-title mt-5">Device sync history</div>
      <section className="card">
        {history.length === 0 ? (
          <p className="text-sm text-mute">
            No syncs yet. Simulated sync attempts on this device will appear here.
          </p>
        ) : (
          history.slice(0, 10).map((l) => <LogRow key={l.id} l={l} />)
        )}
      </section>

      <div className="seg-title mt-5">Simulated delivery channels (not connected to Supabase sync)</div>
      <section className="card">
        {(Object.keys(CHANNELS) as (keyof typeof CHANNELS)[]).map((id) => (
          <div className="feed-item" key={id}>
            <span className="feed-icon" style={{ color: 'var(--brand)' }}>
              {id === 'sms-gateway' ? <IconClock width={16} height={16} /> : id === 'gmail' ? <IconMail width={16} height={16} /> : <IconRefresh width={16} height={16} />}
            </span>
            <div className="feed-body grow">
              <div className="feed-title">{CHANNELS[id].label}</div>
              <div className="feed-sub">{CHANNELS[id].desc}</div>
            </div>
            <Chip tone="tone-grey" dot>{CHANNELS[id].short}</Chip>
          </div>
        ))}
      </section>
    </>
  )
}

function LogRow({ l }: { l: SyncLog }) {
  return (
    <div className="log-row">
      <span className={`feed-icon ${l.outcome === 'success' ? '' : l.outcome === 'partial' ? 'log-warn' : 'log-err'}`}>
        {l.outcome === 'success' ? <IconCheck width={15} height={15} /> : l.outcome === 'partial' ? <IconClock width={15} height={15} /> : <IconCloudOff width={15} height={15} />}
      </span>
      <div className="grow">
        <div className="flex gap-md wrap">
          <span className="row-title" style={{ fontSize: 13.5 }}>{CHANNELS[l.channel].short} sync</span>
          <Chip tone={l.outcome === 'success' ? 'tone-green' : l.outcome === 'partial' ? 'tone-amber' : 'tone-red'}>
            {l.outcome}
          </Chip>
          {l.failed > 0 && <Chip tone="tone-red">{l.failed} failed</Chip>}
        </div>
        <div className="row-sub mono">
          {l.items} item{l.items === 1 ? '' : 's'} · {l.synced} processed by simulator · {l.triggeredBy}
        </div>
      </div>
      <span className="text-xs text-mute" style={{ whiteSpace: 'nowrap' }}>
        {fmtTimeOfDay(l.finishedAt)} {fmtRelative(l.finishedAt)}
      </span>
    </div>
  )
}

function downloadBackup(db: ReturnType<typeof dbForUser>): void {
  const backup = makeAccountBackup(db)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `agrisync-account-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  toast('Account backup downloaded. Keep it in a secure location.')
}