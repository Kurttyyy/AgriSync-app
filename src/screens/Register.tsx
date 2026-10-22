import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerFarmerAccount, useAppState } from '../data/store'
import { Button, Field } from '../components/kit'
import { IconEye, IconEyeOff } from '../components/icons'
import { defaultRiceSeason } from '../data/util'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [farmSize, setFarmSize] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const databaseError = useAppState((state) => state.databaseError)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(null)
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    if (![name, email, phone, village, district].every((value) => value.trim())) {
      setError('Complete your name, email, phone number, village, and city or municipality.')
      return
    }
    const size = Number(farmSize)
    if (!Number.isFinite(size) || size <= 0) {
      setError('Enter a valid farm size.')
      return
    }

    setBusy(true)
    try {
      const result = await registerFarmerAccount({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        village: village.trim(),
        district: district.trim(),
        farmSizeHa: size,
        primaryCrop: 'Palay (rice)',
        activeSeason: defaultRiceSeason(),
        creditRisk: 'medium',
        joinedDate: new Date().toISOString(),
      }, password)
      if (result.confirmationRequired) {
        setConfirmationEmail(email.trim().toLowerCase())
        return
      }
      if (!result.user) throw new Error('Account creation did not return a user.')
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card register-card">
        <div className="login-brand">
          <span className="brand-glyph" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22 5 19V9l7-3 7 3v10l-7 3Z" />
              <path d="M5 9l7 3 7-3M12 12v10M12 5V2" />
            </svg>
          </span>
          <div>
            <div className="brand-name">Rice Farm Expenses</div>
            <div className="brand-sub">Farmer account</div>
          </div>
        </div>

        <h1 className="login-title">Create your account</h1>
        <p className="login-sub">Each account is linked to one farmer profile.</p>

        {confirmationEmail && (
          <p className="login-success mb-3" role="status">
            Your account was created. Confirm the email sent to {confirmationEmail}, then return to sign in.
          </p>
        )}

        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Full name">
              <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Email (your login)">
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Phone number">
              <input className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
            <Field label="Village">
              <input className="input" autoComplete="address-level3" value={village} onChange={(e) => setVillage(e.target.value)} required />
            </Field>
            <Field label="City / municipality">
              <input className="input" autoComplete="address-level2" value={district} onChange={(e) => setDistrict(e.target.value)} required />
            </Field>
            <Field label="Farm size (hectares)">
              <input className="input" type="number" min="0.1" step="0.1" value={farmSize} onChange={(e) => setFarmSize(e.target.value)} required />
            </Field>
            <Field label="Password (at least 8 characters)">
              <div className="password-input-wrap">
                <input className="input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
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
            <Field label="Confirm password">
              <div className="password-input-wrap">
                <input className="input" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                >
                  {showConfirmPassword ? <IconEyeOff aria-hidden="true" /> : <IconEye aria-hidden="true" />}
                </button>
              </div>
            </Field>
          </div>

          {(error || databaseError) && <div className="login-error" role="alert"><span className="dot" />{error ?? databaseError}</div>}

          <Button type="submit" block className="mt-3" loading={busy}>Create account</Button>
        </form>

        <p className="text-sm mt-4" style={{ textAlign: 'center' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 700 }}>Sign in</Link>
        </p>
        <p className="login-foot">Your account and farm records are stored securely in the connected database.</p>
      </div>
    </div>
  )
}
