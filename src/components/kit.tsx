import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { OutboxStatus } from '../domain/types'
import { IconCheck, IconClock, IconRefresh } from './icons'

/* ---------------- colors helpers ---------------- */

export const HEALTH_TONE: Record<string, string> = {
  good: 'tone-green',
  fair: 'tone-amber',
  poor: 'tone-red',
}

export const RISK_TONE: Record<string, string> = {
  low: 'tone-green',
  medium: 'tone-amber',
  high: 'tone-red',
}

export const STATUS_TONE: Record<OutboxStatus, string> = {
  pending: 'tone-amber',
  syncing: 'tone-blue',
  synced: 'tone-green',
  failed: 'tone-red',
}

export const STATUS_LABEL: Record<OutboxStatus, string> = {
  pending: 'Pending',
  syncing: 'Syncing',
  synced: 'Processed',
  failed: 'Failed',
}

export function statusTone(status?: string): string {
  if (!status) return 'tone-grey'
  return STATUS_TONE[status as OutboxStatus] ?? 'tone-grey'
}

/* ---------------- primitives ---------------- */

export function Chip({
  tone = 'tone-grey',
  dot,
  children,
}: {
  tone?: string
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span className={`chip ${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

export function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {icon}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  )
}

export function Avatar({ initials, size = 44 }: { initials: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size / 3 }}>
      {initials}
    </div>
  )
}

export function Initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function Empty({
  icon,
  title,
  sub,
}: {
  icon?: ReactNode
  title: string
  sub?: string
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <div style={{ fontWeight: 650, color: 'var(--ink)', fontSize: 14 }}>{title}</div>
      {sub && <div className="text-sm mt-2">{sub}</div>}
    </div>
  )
}

export function Seg({
  children,
  icon,
  style,
}: {
  children: ReactNode
  icon?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className="seg-title" style={style}>
      {icon}
      {children}
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function Meta({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="meta-kv">
      {rows.map(([k, v]) => (
        <div className="kv" key={k}>
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- button ---------------- */

export function Button({
  children,
  variant = 'primary',
  size,
  block,
  disabled,
  loading,
  className = '',
  onClick,
  type = 'button',
}: {
  children: ReactNode
  variant?: 'primary' | 'accent' | 'ghost' | 'soft' | 'danger'
  size?: 'sm'
  block?: boolean
  disabled?: boolean
  loading?: boolean
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${size ? ` btn-${size}` : ''}${block ? ' btn-block' : ''} ${
        loading ? ' loading' : ''
      } ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <IconRefresh className="spin" />}
      {children}
    </button>
  )
}

/* ---------------- form fields ---------------- */

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

/* ---------------- modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ fontSize: 17 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------------- toast ---------------- */

interface Toast {
  id: number
  text: string
  tone?: 'ok' | 'alert'
}

let toastSeq = 0
const toasts = new Set<Toast>()
const toastListeners = new Set<() => void>()

function emit(): void {
  toastListeners.forEach((l) => l())
}

export function toast(text: string, tone: 'ok' | 'alert' = 'ok'): void {
  const id = ++toastSeq
  const entry: Toast = { id, text, tone }
  toasts.add(entry)
  emit()
  setTimeout(() => {
    toasts.delete(entry)
    emit()
  }, 3000)
}

export function ToastHost() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    toastListeners.add(l)
    return () => {
      toastListeners.delete(l)
    }
  }, [])
  const list = [...toasts]
  if (list.length === 0) return null
  return (
    <div className="toast-wrap">
      {list.map((t) => (
        <div className="toast" key={t.id}>
          {t.tone === 'ok' ? <IconCheck width={16} height={16} /> : <IconClock width={16} height={16} />}
          {t.text}
        </div>
      ))}
    </div>
  )
}

/* ---------------- confirm dialog ---------------- */

interface ConfirmRequest {
  title: string
  message: string
  resolve: (ok: boolean) => void
}

const confirmQueue: ConfirmRequest[] = []
const confirmListeners = new Set<() => void>()

function emitConfirm(): void {
  confirmListeners.forEach((l) => l())
}

export function confirmDialog(title: string, message: string, onOk: () => void): void {
  confirmQueue.push({
    title,
    message,
    resolve: (ok) => {
      if (ok) onOk()
    },
  })
  emitConfirm()
}

export function ConfirmHost() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    confirmListeners.add(l)
    return () => {
      confirmListeners.delete(l)
    }
  }, [])
  const req = confirmQueue[0]
  if (!req) return null
  return (
    <Modal
      open
      title={req.title}
      onClose={() => {
        confirmQueue.shift()
        req.resolve(false)
        emitConfirm()
      }}
    >
      <p className="text-sm" style={{ color: 'var(--text)' }}>{req.message}</p>
      <div className="flex gap-md mt-4" style={{ justifyContent: 'flex-end' }}>
        <button
          className="btn btn-ghost"
          onClick={() => {
            confirmQueue.shift()
            req.resolve(false)
            emitConfirm()
          }}
        >
          Cancel
        </button>
        <button
          className="btn btn-danger-ghost"
          onClick={() => {
            confirmQueue.shift()
            req.resolve(true)
            emitConfirm()
          }}
        >
          Confirm
        </button>
      </div>
    </Modal>
  )
}