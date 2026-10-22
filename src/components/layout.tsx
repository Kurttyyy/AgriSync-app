import { useEffect, type ReactNode, type SVGProps, type ReactElement } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { logout, useAppState } from '../data/store'
import { syncDatabaseNow } from '../data/store'
import { runSync } from '../data/sync'
import { dbForUser, outboxForUser } from '../data/selectors'
import { toast, Avatar } from './kit'
import {
  IconChart,
  IconCloudOff,
  IconExpense,
  IconFarmers,
  IconHome,
  IconLogout,
  IconCashAdvance,
  IconRefresh,
  IconSync,
  IconWallet,
} from './icons'

export const NAV_ITEMS: {
  to: string
  label: string
  icon: (p: SVGProps<SVGSVGElement>) => ReactElement
  end?: boolean
}[] = [
  { to: '/', label: 'Home', icon: IconHome, end: true },
  { to: '/farmers', label: 'Farm Profiles', icon: IconFarmers },
  { to: '/cash-advances', label: 'Cash Advances', icon: IconCashAdvance },
  { to: '/expenses', label: 'Expenses', icon: IconExpense },
  { to: '/analytics', label: 'Analytics', icon: IconChart },
  { to: '/finance', label: 'Rice Finance', icon: IconWallet },
  { to: '/sync', label: 'Sync Status', icon: IconSync },
]

function useReconnectAutoSync() {
  useEffect(() => {
    const hadOnline = () => {
      const prev = window.__agriledgerWasOnline
      window.__agriledgerWasOnline = navigator.onLine
      if (navigator.onLine && prev === false) {
        void syncDatabaseNow().catch(() => undefined)
      }
    }
    window.addEventListener('online', hadOnline)
    hadOnline()
    return () => window.removeEventListener('online', hadOnline)
  }, [])
}

declare global {
  interface Window {
    __agriledgerWasOnline?: boolean
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  useReconnectAutoSync()
  useEffect(() => {
    const onStorageError = () => toast('Could not save data on this device. Check available storage.', 'alert')
    const onDatabaseError = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { message?: unknown } : null
      const message = typeof detail?.message === 'string' ? detail.message : 'Unable to save data to the database.'
      toast(message, 'alert')
    }
    window.addEventListener('agriledger:storage-error', onStorageError)
    window.addEventListener('agriledger:database-error', onDatabaseError)
    return () => {
      window.removeEventListener('agriledger:storage-error', onStorageError)
      window.removeEventListener('agriledger:database-error', onDatabaseError)
    }
  }, [])
  const online = useAppState((s) => s.online)
  const databaseError = useAppState((s) => s.databaseError)
  useEffect(() => {
    if (databaseError) toast(databaseError, 'alert')
  }, [databaseError])
  const syncing = useAppState((s) => s.syncing)
  const user = useAppState((s) => s.auth.user)
  const allDb = useAppState((s) => s.db)
  const allOutbox = useAppState((s) => s.outbox)
  const userDb = dbForUser(allDb, user)
  const outbox = outboxForUser(allOutbox, userDb)
  const allPending = outbox.filter((item) => item.status === 'pending' || item.status === 'failed').length
  const pending = allPending
  const navItems = NAV_ITEMS
  const displayName = user?.name ?? 'Farmer'
  const initials = user?.initials ?? initialsOf(displayName)

  const fatal = pending >= 2 && syncing
  const databaseSaveStatus = useAppState((s) => s.databaseSaveStatus)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand-mark" aria-label="Rice Farm Expense Recording and Monitoring System home">
            <span className="brand-glyph">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22 5 19V9l7-3 7 3v10l-7 3Z" />
                <path d="M5 9l7 3 7-3M12 12v10" />
                <path d="M12 5V2" />
              </svg>
            </span>
            <span>
              <span className="brand-name">Rice Farm Expenses</span>
              <span className="brand-sub">Recording &amp; Monitoring System</span>
            </span>
          </Link>

          <nav className="top-nav" aria-label="Main">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Icon width={17} height={17} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-actions">
            <Chip online={online} />
            <button
              className="btn btn-ghost btn-sm app-refresh-btn"
              type="button"
              aria-label="Reload app"
              title="Reload app"
              onClick={() => window.location.reload()}
            >
              <IconRefresh width={16} height={16} />
              <span>Refresh</span>
            </button>
            <SyncButton
              pending={pending}
              syncing={syncing}
              online={online}
              itemIds={outbox.map((item) => item.id)}
            />
            <div className="topbar-user" title={displayName}>
              <span className="topbar-user-name">{displayName}</span>
              <span className="topbar-user-role">Farmer</span>
            </div>
            <span style={{ display: 'grid' }}>
              <Avatar initials={initials} size={38} />
            </span>
            <button className="btn btn-ghost btn-sm logout-btn" onClick={() => {
              void logout().catch((error: unknown) => {
                toast(error instanceof Error ? error.message : 'Unable to sign out.', 'alert')
              })
            }} title="Sign out">
              <IconLogout width={16} height={16} />
              <span className="logout-label">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {!online && <OfflineBanner databaseSaveStatus={databaseSaveStatus} />}

      <main className="main">{children}</main>

      <nav className="bottomnav" aria-label="Primary">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `bn-item${isActive ? ' active' : ''}`}
            aria-label={label}
          >
            <Icon width={22} height={22} />
            {label}
          </NavLink>
        ))}
        <button className="bn-item bn-signout" onClick={() => {
          void logout().catch((error: unknown) => {
            toast(error instanceof Error ? error.message : 'Unable to sign out.', 'alert')
          })
        }} aria-label="Sign out">
          <IconLogout width={22} height={22} />
          Sign out
        </button>
      </nav>

      {pending > 0 && !fatal && (
        <button
          className="fab"
          aria-label="Run simulated message processing"
          disabled={syncing}
          onClick={() => {
            if (syncing) return
            if (!online) {
              toast('Connect to the network to process queued records', 'alert')
              return
            }
            void runSync('manual', new Set(outbox.map((item) => item.id))).then((n) => toast(n > 0 ? `${n} records processed` : 'Nothing to process'))
          }}
        >
          {syncing ? (
            <IconSync className="spin" width={26} height={26} />
          ) : (
            <IconSync width={26} height={26} />
          )}
        </button>
      )}
    </div>
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function Chip({ online }: { online: boolean }) {
  return (
    <span className={`chip ${online ? 'tone-green' : 'tone-amber'}`}>
      <span className="dot" />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

function SyncButton({ pending, syncing, online, itemIds }: {
  pending: number
  syncing: boolean
  online: boolean
  itemIds: string[]
}) {
  const disabled = syncing || !online
  return (
    <button
      className={`btn btn-sm ${syncing ? 'btn-soft' : pending > 0 && online ? 'btn-primary' : 'btn-ghost'}`}
      onClick={() => {
        if (disabled) return
        void runSync('manual', new Set(itemIds)).then((n) => toast(n > 0 ? `${n} records processed` : 'All up to date'))
      }}
      disabled={disabled}
      title={online ? 'Run simulated message-channel processing' : 'Connect to run the message simulator'}
    >
      {syncing ? <IconSync className="spin" width={16} height={16} /> : <IconSync width={16} height={16} />}
      <span>{syncing ? 'Processing…' : !online ? 'Offline' : pending > 0 ? `Simulate ${pending}` : 'Simulator'}</span>
    </button>
  )
}

function OfflineBanner({ databaseSaveStatus }: { databaseSaveStatus: 'saved' | 'pending' | 'saving' | 'error' }) {
  return (
    <div className="offline-banner">
      <IconCloudOff width={18} height={18} />
      <span>
        You&rsquo;re offline — changes are saved on this device
        {databaseSaveStatus === 'pending' || databaseSaveStatus === 'error' ? ' and will sync to Supabase when reconnected.' : '.'}
      </span>
    </div>
  )
}