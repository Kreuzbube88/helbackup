import { useCallback, useEffect, useRef, useState } from 'react'

export function useUnsavedChanges<T>(current: T) {
  const baseline = useRef<string>(JSON.stringify(current))
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const changed = JSON.stringify(current) !== baseline.current
    setHasChanges(changed)
  }, [current])

  const resetChanges = useCallback((newBaseline?: T) => {
    baseline.current = JSON.stringify(newBaseline ?? current)
    setHasChanges(false)
  }, [current])

  return { hasChanges, resetChanges }
}
