import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '../data/store'
import { createFarmer, updateFarmer } from '../data/repository'
import { linkFarmerProfile } from '../data/store'
import { toast, Button, Field } from '../components/kit'
import { IconChevronLeft } from '../components/icons'

const PH_PREFIX = '+63 '

function localNumber(phone: string): string {
  return phone.startsWith('+63') ? phone.replace(/^\+63\s*/, '').trim() : phone
}

function formatLocal(digits: string): string {
  return digits.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')
}

export default function FarmerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const farmer = useAppState((state) => state.db.farmers.find((item) => item.id === id))
  const isNew = !id
  const [form, setForm] = useState(() => ({
    name: farmer?.name ?? '',
    phone: farmer?.phone ?? PH_PREFIX,
    email: farmer?.email ?? '',
    village: farmer?.village ?? '',
    district: farmer?.district ?? '',
    farmSizeHa: farmer?.farmSizeHa?.toString() ?? '',
    primaryCrop: farmer?.primaryCrop ?? 'Palay (rice)',
  }))
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  function setPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    set('phone', PH_PREFIX + (digits ? formatLocal(digits) : ''))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!isNew && !farmer) {
      toast('Your farm profile could not be found.', 'alert')
      return
    }
    const size = Number(form.farmSizeHa)
    if (!form.name.trim() || !Number.isFinite(size) || size <= 0) {
      toast('Enter your name and a valid farm size.', 'alert')
      return
    }
    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      village: form.village.trim(),
      district: form.district.trim(),
      farmSizeHa: size,
      primaryCrop: form.primaryCrop,
    }
    if (isNew) {
      const created = createFarmer({
        ...data,
        creditRisk: 'medium',
        joinedDate: new Date().toISOString(),
      })
      linkFarmerProfile(created.id)
      toast('Farmer profile added to your account.')
      navigate(`/farmers/${created.id}`)
    } else if (farmer) {
      updateFarmer(farmer.id, data)
      toast('Your farm profile was updated.')
      navigate(`/farmers/${farmer.id}`)
    }
  }

  if (!isNew && !farmer) {
    return <section className="card"><p>Your farm profile could not be found.</p><Link to="/" className="btn btn-ghost mt-4">Back to home</Link></section>
  }

  const profile = farmer
  const returnTo = profile ? `/farmers/${profile.id}` : '/farmers'

  return (
    <>
      <div className="page-header">
        <div className="flex gap-md">
          <Link to={returnTo} className="icon-btn" aria-label={isNew ? 'Back to farm profiles' : 'Back to profile'}>
            <IconChevronLeft />
          </Link>
          <div>
            <div className="crumb">Farm profiles</div>
            <h1 className="mt-2" style={{ fontSize: 21 }}>{isNew ? 'Add farmer profile' : `Update ${profile?.name ?? 'profile'}`}</h1>
          </div>
        </div>
      </div>

      <form onSubmit={submit}>
        <section className="card">
          <h3 className="mb-4">{isNew ? 'Farmer details' : 'Profile details'}</h3>
          <div className="form-grid">
            <Field label="Name">
              <input className="input" value={form.name} onChange={(event) => set('name', event.target.value)} required />
            </Field>
            <Field label="Phone number">
              <div className="phone-wrap">
                <span className="phone-prefix">+63</span>
                <input className="input" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXXX" value={localNumber(form.phone)} onChange={(event) => setPhone(event.target.value)} />
              </div>
            </Field>
            <Field label="Email address">
              <input className="input" type="email" value={form.email} onChange={(event) => set('email', event.target.value)} />
            </Field>
            <Field label="Village">
              <input className="input" value={form.village} onChange={(event) => set('village', event.target.value)} />
            </Field>
            <Field label="City / municipality">
              <input className="input" value={form.district} onChange={(event) => set('district', event.target.value)} />
            </Field>
            <Field label="Farm size (hectares)">
              <input className="input" type="number" min="0.1" step="0.1" value={form.farmSizeHa} onChange={(event) => set('farmSizeHa', event.target.value)} required />
            </Field>
            <Field label="Main crop">
              <select className="select" value={form.primaryCrop} onChange={(event) => set('primaryCrop', event.target.value)}>
                {['Palay (rice)', 'Corn', 'Onion', 'Garlic', 'Vegetables', 'Mango', 'Sweet potato'].map((crop) => (
                  <option key={crop}>{crop}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div className="flex gap-md mt-4">
          <Button type="submit" block>{isNew ? 'Save farmer profile' : 'Save changes'}</Button>
          <Link to={returnTo} className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
