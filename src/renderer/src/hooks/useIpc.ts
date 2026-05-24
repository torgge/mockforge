import { useState, useCallback, useEffect, useRef } from 'react'

interface UseIpcState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

interface UseIpcReturn<T, Args extends unknown[]> {
  data: T | null
  isLoading: boolean
  error: string | null
  execute: (...args: Args) => Promise<T | undefined>
  reset: () => void
}

export function useIpc<T, Args extends unknown[] = []>(
  fn: (...args: Args) => Promise<T>,
): UseIpcReturn<T, Args> {
  const [state, setState] = useState<UseIpcState<T>>({
    data: null,
    isLoading: false,
    error: null,
  })
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setState((s) => ({ ...s, isLoading: true, error: null }))
      try {
        const result = await fn(...args)
        if (mountedRef.current) {
          setState({ data: result, isLoading: false, error: null })
        }
        return result
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred'
        if (mountedRef.current) {
          setState({ data: null, isLoading: false, error: message })
        }
        return undefined
      }
    },
    [fn],
  )

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}
