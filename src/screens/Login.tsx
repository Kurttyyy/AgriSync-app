import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, useAppState } from '../data/store'
import { Button, Field } from '../components/kit'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const databaseError = useAppState((state) => state.databaseError)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    if (!username.trim() || !password) {
      setError('Enter both your username and password.')
      setBusy(false)
      return
    }
    try {
      const user = await login(username, password)
      if (!user) {
        setError('Email or password is incorrect.')
        return
      }
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in right now.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-glyph">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22 5 19V9l7-3 7 3v10l-7 3Z" />
              <path d="M5 9l7 3 7-3M12 12v10" />
              <path d="M12 5V2" />
            </svg>
          </span>
          <div>
            <div className="brand-name">Rice Farm Expenses</div>
            <div className="brand-sub">Recording &amp; Monitoring System</div>
          </div>
        </div>

        <h1 className="login-title">Sign in to your farm account</h1>
        <p className="login-sub">Each farmer has a separate account and private farm records.</p>

        <form onSubmit={handleSubmit} noValidate>
          <Field label="Email">
            <input
              className="input"
              type="email"
              autoCapitalize="off"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </Field>
          <Field label="Password" className="mt-3">
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </Field>

          {(error || databaseError) && (
            <div className="login-error" role="alert">
              <span className="dot" />
              {error ?? databaseError}
            </div>
          )}

          <Button type="submit" block className="mt-4" loading={busy}>
            Sign in
          </Button>
        </form>

        <p className="text-sm mt-4" style={{ textAlign: 'center' }}>
          Don&rsquo;t have an account? <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 700 }}>Create one</Link>
        </p>

        <p className="text-sm mt-4" style={{ textAlign: 'center' }}>
          <Link to="/qr" style={{ color: 'var(--brand)', fontWeight: 700 }}>Show app access QR code</Link>
        </p>

        <p className="login-foot">Farmer-only system · accounts and farm records are stored securely in the connected database.</p>
      </div>
    </div>
  )
}