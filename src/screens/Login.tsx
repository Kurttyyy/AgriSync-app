import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, useAppState } from '../data/store'
import { Button, Field } from '../components/kit'
import { IconEye, IconEyeOff } from '../components/icons'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Sign in to access your farmer account and farm records.</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
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
          <Field label="Password">
            <div className="password-input-wrap">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <IconEyeOff aria-hidden="true" /> : <IconEye aria-hidden="true" />}
              </button>
            </div>
          </Field>

          {(error || databaseError) && (
            <div className="login-error" role="alert">
              <span className="dot" />
              {error ?? databaseError}
            </div>
          )}

          <Button type="submit" block loading={busy}>
            Sign in
          </Button>
        </form>

        <div className="login-links">
          <p className="login-register">
            New to the app? <Link to="/register">Create an account</Link>
          </p>
          <Link className="login-qr-link" to="/qr">Show app access QR code</Link>
        </div>

        <p className="login-foot">Your account and farm records are stored securely in the connected database.</p>
      </div>
    </div>
  )
}