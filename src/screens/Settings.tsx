import { useEffect, useState } from 'react'
import { IconRefresh, IconSync } from '../components/icons'
import { toast } from '../components/kit'
import { dbForUser, outboxForUser } from '../data/selectors'
import { runSync } from '../data/sync'
import { useAppState } from '../data/store'
import { loadAuthenticatedFarmerProfile, type AuthenticatedFarmerProfile } from '../data/supabase'

export default function Settings() {
  const user = useAppState((state) => state.auth.user)
  const allDb = useAppState((state) => state.db)
  const allOutbox = useAppState((state) => state.outbox)
  const online = useAppState((state) => state.online)
  const syncing = useAppState((state) => state.syncing)
  const userDb = dbForUser(allDb, user)
  const outbox = outboxForUser(allOutbox, userDb)
  const pending = outbox.filter((item) => item.status === 'pending' || item.status === 'failed').length
  const [profileResult, setProfileResult] = useState<{
    profile: AuthenticatedFarmerProfile | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    let active = true
    void loadAuthenticatedFarmerProfile()
      .then((profile) => {
        if (active) setProfileResult({ profile, error: null })
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileResult({
            profile: null,
            error: error instanceof Error ? error.message : 'Unable to load your farmer profile.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb">Account</div>
          <h1 className="mt-2">Settings</h1>
          <p className="text-sm mt-2">View your farmer account details.</p>
        </div>
      </div>

      <section className="card" aria-labelledby="farmer-account-title" aria-live="polite">
        <div className="card-title" id="farmer-account-title">Farmer account</div>
        {!profileResult ? (
          <p className="text-sm mt-2" role="status">Loading your Farmer ID…</p>
        ) : profileResult.error ? (
          <p className="text-sm mt-2" role="alert">Unable to load your farmer profile: {profileResult.error}</p>
        ) : profileResult.profile ? (
          <div className="form-grid mt-3">
            <div>
              <div className="row-sub">Farmer ID</div>
              <div className="row-title">{profileResult.profile.farmerId ?? 'Not assigned'}</div>
            </div>
            <div>
              <div className="row-sub">Farmer Name</div>
              <div className="row-title">{profileResult.profile.name ?? 'Name not available'}</div>
            </div>
            <div>
              <div className="row-sub">Email</div>
              <div className="row-title">{profileResult.profile.email ?? 'Email not available'}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm mt-2">No authenticated farmer profile is available.</p>
        )}
      </section>

      <section className="card mt-4" aria-labelledby="app-controls-title">
        <div className="card-title" id="app-controls-title">App controls</div>
        <p className="text-sm text-mute mt-2">Refresh the app or run the message-channel simulator for queued records.</p>
        <div className="flex gap-md wrap mt-3">
          <button className="btn btn-ghost" type="button" onClick={() => window.location.reload()}>
            <IconRefresh width={16} height={16} />
            Refresh app
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={syncing || !online}
            title={online ? 'Run simulated message-channel processing' : 'Connect to run the message simulator'}
            onClick={() => {
              void runSync('manual', new Set(outbox.map((item) => item.id)))
                .then((count) => toast(count > 0 ? `${count} record${count === 1 ? '' : 's'} processed` : 'Nothing to process'))
                .catch((error: unknown) => {
                  toast(error instanceof Error ? error.message : 'Unable to run the message simulator.', 'alert')
                })
            }}
          >
            {syncing ? <IconSync className="spin" width={16} height={16} /> : <IconSync width={16} height={16} />}
            {syncing ? 'Processing…' : !online ? 'Offline' : pending > 0 ? `Simulate ${pending}` : 'Simulator'}
          </button>
        </div>
      </section>
    </>
  )
}
