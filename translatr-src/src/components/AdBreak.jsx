import { useEffect, useState } from 'react'
import { CARD_CREATIVES } from '../data/gameData'
import { sfx } from '../lib/audio/engine'

// The unskippable ad the minigames use (DOOMSCROLL hits, Arcade continues and free credits).
// It covers the nearest positioned parent.

export const AD_SECONDS = 5

/** `[ad, showAd]`: showAd(then) plays a five-second ad, then calls `then()`. `onShow` counts it. */
export function useAdBreak(onShow) {
  const [ad, setAd] = useState(null) // { creative, left, then }
  const showAd = (then) => {
    setAd({ creative: CARD_CREATIVES[Math.floor(Math.random() * CARD_CREATIVES.length)], left: AD_SECONDS, then })
    sfx('popup')
    onShow?.()
  }
  useEffect(() => {
    if (!ad) return
    if (ad.left <= 0) {
      setAd(null)
      ad.then()
      return
    }
    const t = setTimeout(() => setAd((a) => a && { ...a, left: a.left - 1 }), 1000)
    return () => clearTimeout(t)
  }, [ad])
  return [ad, showAd]
}

/** Five seconds of someone else's product. No close button. That's the point. */
export function AdBreak({ ad }) {
  const { creative, left } = ad
  return (
    <div className="shooter-ad" role="alert">
      <div className="shooter-ad-card">
        <div className="shooter-ad-top">
          <span>Advertisement</span>
          <span>Your game resumes in {left}</span>
        </div>
        <div className={`stock-watermark grid h-28 place-items-center bg-linear-to-br text-6xl ${creative.theme}`}>{creative.art}</div>
        <div className="px-4 py-3 text-center">
          <div className="font-comic text-lg font-bold leading-tight">{creative.headline}</div>
          <p className="mt-1 text-[0.8125rem] opacity-70">{creative.body}</p>
          <span className="btn btn-gold btn-sm mt-2">{creative.cta}</span>
        </div>
        <div className="shooter-ad-meter">
          <span style={{ width: `${((AD_SECONDS - left) / AD_SECONDS) * 100}%` }} />
        </div>
        <button className="shooter-skip" disabled>
          Skip ad in {left}… (it can’t be skipped)
        </button>
      </div>
    </div>
  )
}
