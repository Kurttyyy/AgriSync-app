import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updateAccountPassword } from '../data/store'
import { Button, Field } from '../components/kit'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateAccountPassword(password)
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the password. Request a new reset link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-glyph" aria-hidden>R</span>
          <div><div className="brand-name">Rice Farm Expenses</div><div className="brand-sub">Account recovery</div></div>
        </div>
        <h1 className="login-title">Choose a new password</h1>
        <p className="login-sub">Use at least 8 characters for your new password.</p>
        <form className="login-form" onSubmit={submit} noValidate>
          <Field label="New password">
            <input className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          </Field>
          <Field label="Confirm new password">
            <input className="input" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
          </Field>
          {error && <div className="login-error" role="alert"><span className="dot" />{error}</div>}
          <Button type="submit" block loading={busy}>Update password</Button>
        </form>
        <p className="login-register mt-4"><Link to="/login">Back to sign in</Link></p>
      </section>
    </div>
  )
}
