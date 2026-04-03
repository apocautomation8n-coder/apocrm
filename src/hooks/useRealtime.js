import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useRealtime(table, filter, onInsert) {
  const callbackRef = useRef(onInsert)
  callbackRef.current = onInsert

  useEffect(() => {
    const channelName = `realtime-${table}-${JSON.stringify(filter)}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          ...(filter || {}),
        },
        (payload) => {
          callbackRef.current?.(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, JSON.stringify(filter)])
}

export function useRealtimeAll(table, callbacks) {
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-all-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          const { eventType } = payload
          if (eventType === 'INSERT') callbacksRef.current?.onInsert?.(payload.new)
          if (eventType === 'UPDATE') callbacksRef.current?.onUpdate?.(payload.new, payload.old)
          if (eventType === 'DELETE') callbacksRef.current?.onDelete?.(payload.old)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table])
}
