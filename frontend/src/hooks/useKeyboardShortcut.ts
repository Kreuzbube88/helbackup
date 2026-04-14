import { useEffect } from 'react'

interface KeyCombo {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
}

export function useKeyboardShortcut(
  combo: KeyCombo,
  callback: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return
    function handleKeyDown(e: KeyboardEvent) {
      const matches =
        e.key.toLowerCase() === combo.key.toLowerCase() &&
        (combo.ctrl  ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey)) &&
        (combo.alt   ? e.altKey   : !e.altKey) &&
        (combo.shift ? e.shiftKey : !e.shiftKey)
      if (matches) {
        e.preventDefault()
        callback()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, callback])
}
