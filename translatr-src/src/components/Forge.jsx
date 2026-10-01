import Panel from './Panel'
import { useGameStore, getMiningRate } from '../store/useGameStore'
import { FORGE, FORGE_THEMES, FORGE_THEME_BY_ID, forgeRank } from '../data/expansions'
import { useAnimatedNumber } from '../lib/hooks'
import { money } from '../lib/format'
import { sfx } from '../lib/audio/engine'

const perSecond = (n) => (n < 10 ? `$${n.toFixed(2)}` : money(n))

/** Ye Olde Forge (expansion): passive gold, collected by hand. Its look is bought in the corner. */
export default function Forge() {
  const level = useGameStore((s) => s.forge?.level ?? 1)
  const stored = useGameStore((s) => Math.floor(s.forge?.stored ?? 0))
  const themeId = useGameStore((s) => s.forgeTheme ?? 'medieval')
  const owned = useGameStore((s) => s.forgeThemes ?? ['medieval'])
  const swing = useGameStore((s) => Math.max(1, getMiningRate(s)))
  const wallet = useGameStore((s) => s.money)
  const shown = useAnimatedNumber(stored)
  const theme = FORGE_THEME_BY_ID[themeId] ?? FORGE_THEMES[0]
  const rate = FORGE.swingsPerSecond(level) * swing
  const maxed = level >= FORGE.maxLevel
  const cost = FORGE.upgradeSwings(level) * swing
  const next = FORGE.swingsPerSecond(level + 1) * swing

  const collect = () => {
    const got = useGameStore.getState().collectForge()
    if (got) {
      sfx('kaching')
      useGameStore.getState().toast(`⚒️ Collected ${money(got)} from the Forge.`, 'good')
    }
  }
  const upgrade = () => useGameStore.getState().upgradeForge() && sfx('levelup')
  const pickTheme = (e) => {
    const id = e.target.value
    if (useGameStore.getState().setForgeTheme(id)) sfx('coin')
    else e.target.value = themeId
  }

  const themePicker = (
    <label className="forge-theme-pick" data-no-drag title="Buy a new look for the Forge" onPointerDown={(e) => e.stopPropagation()}>
      <span className="sr-only">Forge theme</span>
      <select value={themeId} onChange={pickTheme}>
        {FORGE_THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.icon} {t.name}
            {owned.includes(t.id) ? '' : ` · ${money(t.price * swing)}`}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <Panel id="win-forge" title="Ye Olde Forge" icon={theme.icon} accent="#b8641e" right={themePicker} className={`forge-window forge-${theme.id}`}>
      <div className={`forge-scene forge-scene-${theme.id}`}>
        <div className="forge-banner">
          <span>{forgeRank(level)}</span>
          <b>Level {level}</b>
        </div>
        <div className="forge-stage" aria-hidden="true">
          <span className="forge-fire">🔥</span>
          <span className="forge-smith">{theme.smith}</span>
          <span className="forge-anvil">⚒️</span>
          <span className="forge-sparks">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="forge-coffers">
          <div className="forge-coffers-label">The coffers</div>
          <div className="forge-coffers-value">{money(shown)}</div>
          <div className="forge-coffers-rate">+{perSecond(rate)} per second, forever. No catch. (We checked twice.)</div>
        </div>
        <div className="forge-buttons">
          <button className="btn btn-gold forge-collect" onClick={collect} disabled={stored < 1}>
            🪙 Collect
          </button>
          <button className="btn btn-ghost" onClick={upgrade} disabled={maxed || wallet < cost} title={maxed ? 'Fully upgraded' : `Next level: +${perSecond(next)}/s`}>
            {maxed ? 'Fully forged' : `⚒️ Upgrade · ${money(cost)}`}
          </button>
        </div>
        <p className="forge-blurb">{theme.blurb}</p>
      </div>
    </Panel>
  )
}
