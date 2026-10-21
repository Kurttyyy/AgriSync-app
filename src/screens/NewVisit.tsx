import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '../data/store'
import { createVisit } from '../data/repository'
import { toast, Button, Field } from '../components/kit'
import { IconChevronLeft } from '../components/icons'

const PESTS = ['Fall armyworm', 'Aphids', 'Rodents', 'None']
const INPUTS = ['Compound D', 'Urea', 'Pre-emergent herbicide', 'Compost', 'Pest spray']

export default function NewVisit() {
  const { id } = useParams()
  const nav = useNavigate()
  const farmer = useAppState((s) => s.db.farmers.find((f) => f.id === id))
  const online = useAppState((s) => s.online)

  const [form, setForm] = useState({
    purpose: '',
    cropStage: 'Early growth',
    health: 'good',
    pests: ['None'] as string[],
    inputs: [] as string[],
    notes: '',
    followUpDate: '',
  })

  if (!farmer) return <Link to="/farmers" className="btn btn-ghost">Back to farmers</Link>
  const f = farmer

  function toggle(list: 'pests' | 'inputs', value: string) {
    setForm((f) => {
      const arr = f[list]
      const next = list === 'pests'
        ? value === 'None'
          ? arr.includes('None') ? [] : ['None']
          : arr.includes(value)
            ? arr.filter((item) => item !== value)
            : [...arr.filter((item) => item !== 'None'), value]
        : arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value]
      return { ...f, [list]: next }
    })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.purpose.trim()) {
      toast('Add a purpose for the visit', 'alert')
      return
    }
    createVisit({
      farmerId: f.id,
      date: new Date().toISOString(),
      purpose: form.purpose.trim(),
      cropStage: form.cropStage,
      health: form.health as 'good' | 'fair' | 'poor',
      pests: form.pests.length ? form.pests : ['None'],
      inputsUsed: form.inputs,
      notes: form.notes.trim() || 'No notes.',
      followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
    })
    toast(
      'Visit saved on this device and added to the local queue.',
      online ? 'ok' : 'alert',
    )
    nav(`/farmers/${f.id}`)
  }

  return (
    <>
      <div className="page-header">
        <div className="flex gap-md">
          <Link to={`/farmers/${f.id}`} className="icon-btn" aria-label="Back">
            <IconChevronLeft />
          </Link>
          <div>
            <div className="crumb">Field assessment · {f.name}</div>
            <h1 className="mt-2" style={{ fontSize: 21 }}>Log visit</h1>
          </div>
        </div>
      </div>

      <form onSubmit={submit}>
        <section className="card">
          <h3 className="mb-4">Visit details</h3>
          <Field label="Purpose of visit">
            <input className="input" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Post-planting check" />
          </Field>
          <div className="form-grid">
            <Field label="Crop stage">
              <select className="select" value={form.cropStage} onChange={(e) => setForm({ ...form, cropStage: e.target.value })}>
                {['Early growth', 'Vegetative', 'Flowering', 'Maturity', 'Harvest'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Overall health">
              <div className="pill-row">
                {(['good', 'fair', 'poor'] as const).map((h) => (
                  <button type="button" key={h} className={`pill${form.health === h ? ' on' : ''}`} onClick={() => setForm({ ...form, health: h })}>
                    {h}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Pests observed" hint="Tap to toggle. Leave 'None' if clear.">
            <div className="pill-row">
              {PESTS.map((p) => (
                <button type="button" key={p} className={`pill${form.pests.includes(p) ? ' on' : ''}`} onClick={() => toggle('pests', p)}>
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Inputs used">
            <div className="pill-row">
              {INPUTS.map((i) => (
                <button type="button" key={i} className={`pill${form.inputs.includes(i) ? ' on' : ''}`} onClick={() => toggle('inputs', i)}>
                  {i}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notes">
            <textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Soil moisture, pest pressure, next actions…" />
          </Field>
          <Field label="Schedule follow-up (optional)">
            <input className="input" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          </Field>
        </section>

        {!online && (
          <div className="card mt-4" style={{ borderColor: 'rgba(217,154,43,.4)', background: 'var(--gold-soft)' }}>
            <div style={{ fontSize: 13, color: 'var(--gold-ink)', fontWeight: 600 }}>
              Offline mode: this visit is stored on this device and remains queued until sync is available.
            </div>
          </div>
        )}

        <div className="flex gap-md mt-4">
          <Button type="submit" block>Save visit</Button>
          <Link to={`/farmers/${f.id}`} className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}