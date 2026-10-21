import { QRCodeSVG } from 'qrcode.react'

export default function QrAccess() {
  const loginUrl = new URL('/login', window.location.origin).toString()

  return (
    <main className="qr-access-screen" aria-label="AgriSync app access QR code">
      <QRCodeSVG
        value={loginUrl}
        size={360}
        level="M"
        includeMargin
        title="Scan to open the AgriSync sign-in page"
      />
    </main>
  )
}
