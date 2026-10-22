import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../data/store'
import { Button, Field } from '../components/kit'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send a password reset email.')
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
        <h1 className="login-title">Reset your password</h1>
        <p className="login-sub">Enter the email address linked to your farmer account.</p>
        {sent ? (
          <p className="login-success" role="status">
            If an account exists for that email, Supabase will send a reset link. Check your inbox and spam folder.
          </p>
        ) : (
          <form className="login-form" onSubmit={submit} noValidate>
            <Field label="Email">
              <input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            {error && <div className="login-error" role="alert"><span className="dot" />{error}</div>}
            <Button type="submit" block loading={busy}>Send reset link</Button>
          </form>
        )}
        <p className="login-register mt-4"><Link to="/login">Back to sign in</Link></p>
      </section>
    </div>
  )
}
