import { useState } from 'react'
import { useInstallPrompt } from '../useInstallPrompt'

export default function InstallAppPrompt() {
  const { available, installed, ios, requestInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  if (installed || dismissed) return null

  return (
    <aside className="install-app" aria-label="Install AgriSync">
      <button
        className="install-app-close"
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install app message"
      >
        ×
      </button>
      <div className="install-app-copy">
        <strong>Use AgriSync like an app</strong>
        <span>Add it to your home screen for quick access.</span>
      </div>
      {available ? (
        <button className="btn btn-primary btn-sm" type="button" onClick={() => void requestInstall()}>
          Install app
        </button>
      ) : (
        <button
          className="btn btn-primary btn-sm"
          type="button"
          aria-expanded={showInstructions}
          onClick={() => setShowInstructions((visible) => !visible)}
        >
          {showInstructions ? 'Hide steps' : 'Show steps'}
        </button>
      )}
      {showInstructions && (
        <p className="install-app-help">
          {ios
            ? 'In Safari, tap Share, then Add to Home Screen.'
            : 'Open your browser menu and choose Install app or Add to Home screen.'}
        </p>
      )}
    </aside>
  )
}
