'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Déclenche quand l'élément entre dans le viewport.
 * Utilisé pour ne charger les rapports IA que lorsqu'ils sont visibles.
 */
export function useWhenVisible(once = true) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node
    },
    []
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { rootMargin: '100px', threshold: 0 }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [once])

  return { ref: setRef, isVisible }
}
