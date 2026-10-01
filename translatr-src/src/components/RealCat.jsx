import { useCallback, useEffect, useState } from 'react'
import { CAT_PHOTOS } from '../data/gameData'

/**
 * A real cat, "animated" the cheap way: two different photos, hard-cut back and forth on a
 * timer. No tweening, no crossfade, entirely on purpose. Both frames stay mounted (one hidden)
 * so the cut is instant; until both have loaded (or if they can't), the mood's emoji stands in.
 */
export default function RealCat({ mood = 'happy', size = 84, round = false, className = '', title }) {
  const set = CAT_PHOTOS[mood] ?? CAT_PHOTOS.happy
  const [frame, setFrame] = useState(0)
  const [loaded, setLoaded] = useState(() => new Set())
  const [failed, setFailed] = useState(false)
  const ready = set.frames.every((src) => loaded.has(src))

  useEffect(() => {
    if (!ready) return
    const id = setInterval(() => setFrame((f) => 1 - f), set.ms)
    return () => clearInterval(id)
  }, [ready, set.ms])

  const markLoaded = useCallback((src) => setLoaded((l) => (l.has(src) ? l : new Set(l).add(src))), [])

  const radius = round ? 'rounded-full' : 'rounded-lg'
  if (failed) {
    return (
      <span className={`inline-grid place-items-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.72 }} title={title ?? set.caption}>
        {set.emoji}
      </span>
    )
  }

  return (
    <span className={`real-cat ${radius} ${className}`} style={{ width: size, height: size }} title={title ?? `${set.caption} · photo: ${set.credit} (CC0)`}>
      {set.frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? set.caption : ''}
          draggable={false}
          decoding="async"
          referrerPolicy="no-referrer"
          // cached images can finish before React attaches onLoad
          ref={(el) => el?.complete && el.naturalWidth > 0 && markLoaded(src)}
          onLoad={() => markLoaded(src)}
          onError={() => setFailed(true)}
          style={{ visibility: ready ? (i === frame ? 'visible' : 'hidden') : 'hidden' }}
        />
      ))}
      {!ready && (
        <span className="absolute inset-0 grid place-items-center" style={{ fontSize: size * 0.6 }} aria-hidden="true">
          {set.emoji}
        </span>
      )}
    </span>
  )
}
