import { useEffect, useState } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  platforms: string[]
}

declare global {
  interface Navigator {
    standalone?: boolean
  }
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true),
  )
  const [ios] = useState(() =>
    typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    ),
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt as EventListener)
    window.addEventListener('appinstalled', onInstalled as EventListener)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt as EventListener)
      window.removeEventListener('appinstalled', onInstalled as EventListener)
    }
  }, [])

  const requestInstall = async () => {
    if (!prompt) return

    try {
      await prompt.prompt()
      const choice = await prompt.userChoice

      if (choice.outcome === 'accepted') {
        setInstalled(true)
        setPrompt(null)
      } else {
        setPrompt(null)
      }
    } catch (error) {
      console.error('Unable to open the app installation prompt.', error)
      setPrompt(null)
    }
  }

  return { available: !!prompt, installed, ios, requestInstall }
}