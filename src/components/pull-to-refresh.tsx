'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 72

export function PullToRefresh() {
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const active = useRef(false)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 2) return
      if (document.body.dataset.overlayOpen) return
      startY.current = e.touches[0].clientY
      active.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) { active.current = false; return }
      e.preventDefault()
      setPullY(Math.min(delta, THRESHOLD + 24))
    }

    function onTouchEnd() {
      if (!active.current) return
      active.current = false
      setPullY(prev => {
        if (prev >= THRESHOLD) {
          setRefreshing(true)
          setTimeout(() => window.location.reload(), 300)
        }
        return 0
      })
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const progress = Math.min(pullY / THRESHOLD, 1)
  if (pullY < 4 && !refreshing) return null

  return (
    <div
      className="fixed top-16 md:top-4 left-1/2 -translate-x-1/2 z-50 w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md pointer-events-none transition-opacity duration-150"
      style={{ opacity: refreshing ? 1 : progress }}
    >
      <RefreshCw
        size={16}
        className={`text-[var(--primary)] ${refreshing ? 'animate-spin' : 'transition-transform'}`}
        style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)` }}
      />
    </div>
  )
}
