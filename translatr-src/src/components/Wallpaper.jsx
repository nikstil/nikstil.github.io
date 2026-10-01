import { memo } from 'react'

// Bubbles are real circles (border-radius clips their gradients), so they can never render
// as clipped squares. Positions are percentages of the viewport; sizes in px.
const BUBBLES = [
  { x: '5%', y: '58%', s: 92 },
  { x: '18%', y: '24%', s: 46 },
  { x: '31%', y: '6%', s: 68 },
  { x: '44%', y: '70%', s: 128 },
  { x: '60%', y: '18%', s: 58 },
  { x: '71%', y: '78%', s: 50 },
  { x: '81%', y: '48%', s: 108 },
  { x: '92%', y: '12%', s: 40 },
]

/**
 * Frutiger Aero wallpaper: sky, sun bloom with soft rays, glossy hills, glass bubbles and a
 * faint noise layer that prevents gradient banding. Entirely static — nothing behind the
 * glass windows moves, so their backdrop blur never has to be recomputed.
 */
export default memo(function Wallpaper() {
  return (
    <div className="wallpaper" aria-hidden="true">
      <div className="wp-sky" />
      <div className="wp-rays" />
      <div className="wp-hills" />
      {BUBBLES.map((b, i) => (
        <span key={i} className="wp-bubble" style={{ left: b.x, top: b.y, width: b.s, height: b.s }} />
      ))}
      <div className="wp-noise" />
    </div>
  )
})
