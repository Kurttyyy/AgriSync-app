import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function base(props: P) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    width: 20,
    height: 20,
    ...props,
  }
}

export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 2.4 3.9 5.5 3.9 9S14.6 18.6 12 21c-2.6-2.4-3.9-5.5-3.9-9S9.4 5.4 12 3Z" />
  </svg>
)

export const IconHome = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-6h4v6" />
  </svg>
)

export const IconFarmers = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c.4-3.2 2.4-5 5.5-5s5.1 1.8 5.5 5" />
    <path d="M16 5.2c1.8.6 3 2.1 3 4.3s-1.2 3.7-3 4.3" />
    <path d="M17.8 14.6c1.7.8 2.9 2.4 3.3 5.4" />
  </svg>
)

export const IconCashAdvance = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v6h-6" />
  </svg>
)

export const IconChart = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </svg>
)

export const IconSync = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 8A8 8 0 0 0 6.3 5.3L4 7.5" />
    <path d="M4 3.5v4h4" />
    <path d="M4 16a8 8 0 0 0 13.7 2.7L20 16.5" />
    <path d="M20 20.5v-4h-4" />
  </svg>
)

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </svg>
)

export const IconEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IconEyeOff = (p: P) => (
  <svg {...base(p)}>
    <path d="m3 3 18 18" />
    <path d="M10.6 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a14.8 14.8 0 0 1-3.1 3.9" />
    <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.1 0 2.1-.2 3-.5" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

export const IconCloudOff = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 9a4.5 4.5 0 0 0-.4 9H17" />
    <path d="M16.8 7.7A5 5 0 0 0 8 8.5M20 20 4 4" />
  </svg>
)

export const IconCloudOk = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 9a4.5 4.5 0 0 0-.4 9H16a3 3 0 0 0 .8-5.9A5 5 0 0 0 8 8.3" />
    <path d="m14 13-4 4-2-2" />
  </svg>
)

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
)

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
)

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
)

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 8A8 8 0 0 0 6.3 5.3L4 7.5" />
    <path d="M4 3.5v4h4" />
    <path d="M4 16a8 8 0 0 0 13.7 2.7L20 16.5" />
    <path d="M20 20.5v-4h-4" />
  </svg>
)

export const IconBell = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
)

export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
)

export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 5-7 7 7 7" />
  </svg>
)

export const IconArrowRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconMapPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const IconPhone = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 3h4l1.5 5L8 10a14 14 0 0 0 6 6l2-2.5L21 15v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z" />
  </svg>
)

export const IconMail = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)

export const IconLeaf = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 21c0-9 4-16 15-16 0 11-6 16-15 16Z" />
    <path d="M5 21c3-4 6-8 10-11" />
  </svg>
)

export const IconWallet = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" />
    <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H3" />
    <path d="M20 12.5v3h-3a1.5 1.5 0 0 1 0-3Z" />
  </svg>
)

export const IconSettings = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
  </svg>
)

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

export const IconWifi = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 9a17 17 0 0 1 19 0" />
    <path d="M5.5 12.5a12 12 0 0 1 13 0" />
    <path d="M8.5 16a7 7 0 0 1 7 0" />
    <path d="M12 19.5h.01" />
  </svg>
)

export const IconDatabase = (p: P) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
  </svg>
)

export const IconSend = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z" />
  </svg>
)

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12M6 9l6 6 6-6" />
    <path d="M4 21h16" />
  </svg>
)

export const IconLogout = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

export const IconExpense = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M16 3v4H8V3" />
    <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
  </svg>
)