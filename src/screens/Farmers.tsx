import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../data/store'
import { dbForUser } from '../data/selectors'
import { Avatar, Chip, Initials, Empty } from '../components/kit'
import { IconChevronRight, IconMapPin, IconPlus, IconSearch } from '../components/icons'

export default function Farmers() {
  const allDb = useAppState((s) => s.db)
  const user = useAppState((s) => s.auth.user)
  const { farmers, visits } = dbForUser(allDb, user)
  const [q, setQ] = useState('')

  const query = q.trim().toLowerCase()
  const filtered = farmers.filter((f) => {
    return (
      !query ||
      f.name.toLowerCase().includes(query) ||
      f.village.toLowerCase().includes(query) ||
      f.primaryCrop.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb">Your account</div>
          <h1 className="mt-2">My farm profiles</h1>
        </div>
        <Link to="/farmers/new" className="btn btn-primary btn-sm">
          <IconPlus width={16} height={16} /> Add farmer profile
        </Link>
      </div>

      <div className="search-box">
        <IconSearch width={18} height={18} />
        <input
          className="input"
          placeholder="Search by name, village or crop…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="result-count">
        {filtered.length} farm profile{filtered.length === 1 ? '' : 's'}
      </div>

      <section className="card">
        {filtered.length === 0 ? (
          <Empty
            icon={<IconSearch width={24} height={24} />}
            title={farmers.length === 0 ? 'No farm profiles yet' : 'No profiles match'}
            sub={farmers.length === 0 ? 'Add a farmer profile to keep their farm records in your account.' : 'Try a different search.'}
          />
        ) : (
          filtered.map((f) => {
            const vCount = visits.filter((v) => v.farmerId === f.id).length
            return (
              <Link to={`/farmers/${f.id}`} key={f.id} className="row-link">
                <Avatar initials={Initials(f.name)} />
                <div className="row-main">
                  <div className="row-title">{f.name}</div>
                  <div className="row-sub">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconMapPin width={11} height={11} /> {f.village}, {f.district}
                    </span>
                    {' · '}
                    {f.primaryCrop} · {vCount} visit{vCount === 1 ? '' : 's'}
                  </div>
                </div>
                <Chip tone={f.creditRisk === 'low' ? 'tone-green' : f.creditRisk === 'medium' ? 'tone-amber' : 'tone-red'}>
                  {f.creditRisk}
                </Chip>
                <IconChevronRight width={17} height={17} style={{ color: 'var(--muted)' }} />
              </Link>
            )
          })
        )}
      </section>
    </>
  )
}