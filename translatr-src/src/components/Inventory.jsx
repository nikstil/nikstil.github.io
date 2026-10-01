import Panel from './Panel'
import { useGameStore, hasSkill, isAuditImmune, getMaxEquipped, itemMods } from '../store/useGameStore'
import { EQUIPPABLES, RELIC } from '../data/gameData'

const TIER_STYLE = {
  common: 'text-ink/80',
  rare: 'text-ice',
  epic: 'text-toxic',
  legendary: 'shiny-text',
}
const TIER_GLOW = { common: '#94a3b8', rare: '#1f8fe0', epic: '#2fae2f', legendary: '#d6336c' }
const TIER_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }

const x = (v) => `×${Number(v.toFixed(2))}`
/** What the loadout adds up to, in words (item effects stack: numbers multiply, swings add). */
const EFFECT_LABELS = {
  mining: (v) => `mining ${x(v)}`,
  stamina: (v) => `max stamina ${x(v)}`,
  regen: (v) => `stamina regen ${x(v)}`,
  autoSwings: (v) => `+${v} swings/s`,
  adRate: (v) => `ads ${x(v)}`,
  catDecay: (v) => `cat needs drain ${x(v)}`,
  boxPrice: (v) => `box prices ${x(v)}`,
  luck: (v) => `item drops ${x(v)}`,
  casino: (v) => `casino wins ${x(v)}`,
  adReward: (v) => `rewarded ads ${x(v)}`,
  auditChance: (v) => `audit odds ${x(v)}`,
  loanInterest: (v) => `loan interest ${x(v)}`,
  contract: (v) => `contracts ${x(v)}`,
  tableLimit: (v) => `table limit ${x(v)}`,
  relic: (v) => `relic odds ${x(v)}`,
  pity: (v) => `pity ${x(v)}`,
  captcha: () => 'no table CAPTCHAs',
  afkProof: () => 'never AFK',
  scratchProof: () => 'scratch-proof items',
  noRefusal: () => 'no refusals',
  noVowelTax: () => 'no Vowel Tax',
}

function loadoutSummary(defs) {
  const parts = []
  const income = defs.reduce((m, d) => m * (d.multiplier ?? 1), 1)
  if (income > 1) parts.push(`income ${x(income)}`)
  for (const [k, v] of Object.entries(itemMods(defs))) if (EFFECT_LABELS[k]) parts.push(EFFECT_LABELS[k](v))
  if (defs.some((d) => d.translates)) parts.push('correct translations')
  if (defs.some((d) => d.auditImmune)) parts.push('audit-immune')
  return parts
}

export default function Inventory() {
  const items = useGameStore((s) => s.items)
  const equipped = useGameStore((s) => s.equipped)
  const trash = useGameStore((s) => s.trash)
  const appraiser = useGameStore((s) => hasSkill(s, 'appraiser'))
  const immune = useGameStore(isAuditImmune)
  const slots = useGameStore(getMaxEquipped)
  const { equip, unequip, recycleTrash, requestPrestige } = useGameStore.getState()

  const byUid = Object.fromEntries(items.map((i) => [i.uid, i]))
  const relics = items.filter((i) => i.itemId === RELIC.id)
  const trashTotal = Object.values(trash).reduce((a, b) => a + b, 0)
  const worn = equipped.map((uid) => EQUIPPABLES[byUid[uid]?.itemId]).filter(Boolean)
  const summary = loadoutSummary(worn)

  // The backpack groups copies of the same item (best rarity first).
  const groups = {}
  for (const i of items) {
    if (!EQUIPPABLES[i.itemId] || equipped.includes(i.uid)) continue
    ;(groups[i.itemId] ??= []).push(i.uid)
  }
  const gear = Object.entries(groups)
    .map(([id, uids]) => ({ def: EQUIPPABLES[id], uids }))
    .sort((a, b) => TIER_ORDER[a.def.tier] - TIER_ORDER[b.def.tier] || a.def.name.localeCompare(b.def.name))

  return (
    <Panel title="Inventory" icon="🎒" accent="#3da6e8" badge={immune ? '🏝️ Audit-immune' : undefined}>
      <div className="mb-2 flex items-center justify-between">
        <span className="label">Equipped</span>
        <span className="font-mono text-[0.6875rem] text-ink/50">
          {equipped.length}/{slots}
        </span>
      </div>
      <div className="mb-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
        {Array.from({ length: slots }, (_, i) => {
          const item = byUid[equipped[i]]
          const def = item && EQUIPPABLES[item.itemId]
          return (
            <button
              key={i}
              onClick={() => item && unequip(item.uid)}
              title={def ? `${def.name} — ${def.desc} (click to unequip)` : 'Empty slot'}
              className={`grid aspect-square place-items-center rounded-xl text-2xl transition ${
                def
                  ? 'border border-ink/15 bg-[radial-gradient(circle,rgba(255,255,255,.08),transparent_70%)] hover:scale-105'
                  : 'border border-dashed border-ink/10 bg-inset/30'
              }`}
              style={def ? { boxShadow: `0 0 18px -6px ${TIER_GLOW[def.tier]}, inset 0 0 0 1px ${TIER_GLOW[def.tier]}55` } : undefined}
            >
              {def ? def.emoji : <span className="text-[0.625rem] text-ink/20">+</span>}
            </button>
          )
        })}
      </div>
      <p className="mb-4 text-[0.6875rem] leading-snug text-ink/55">{summary.length ? `Active: ${summary.join(' · ')}` : 'Nothing equipped.'}</p>

      {relics.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {relics.map((r) => (
            <div
              key={r.uid}
              className="flex items-center justify-between rounded-xl border border-gold/40 bg-[radial-gradient(circle_at_20%_50%,rgba(255,207,63,.18),transparent_60%)] p-2.5 shadow-[0_0_24px_-10px_#ffcf3f]"
            >
              <span className="font-display font-semibold glow-gold">
                {RELIC.emoji} {RELIC.name}
              </span>
              <button onClick={() => requestPrestige(r.uid)} className="btn btn-gold btn-sm">
                Prestige
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="label mb-2">Backpack</div>
      <div className="max-h-48 space-y-1.5 overflow-auto pr-1">
        {gear.length === 0 && <div className="py-2 text-sm text-ink/35">No items. Try opening 10,000 boxes.</div>}
        {gear.map(({ def, uids }) => (
          <div key={def.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink/[0.06] bg-ink/[0.02] p-2 transition hover:border-ink/15">
            <div className="min-w-0">
              <div className={`truncate text-sm font-semibold ${TIER_STYLE[def.tier]}`}>
                {def.emoji} {def.name}
                {uids.length > 1 && <span className="ml-1 font-mono text-[0.6875rem] text-ink/50">×{uids.length}</span>}
              </div>
              <div className="truncate text-[0.6875rem] text-ink/40" title={def.desc}>
                <span className="capitalize">{def.tier}</span> · {def.desc}
              </div>
            </div>
            <button onClick={() => equip(uids[0])} className="btn btn-ghost btn-sm shrink-0" style={{ '--accent': TIER_GLOW[def.tier] }}>
              Equip
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-ink/[0.06] bg-inset/30 p-2.5 text-sm">
        <span className="text-ink/50">🗑️ {trashTotal.toLocaleString()} Useless Trash</span>
        {trashTotal > 0 && (
          <button onClick={recycleTrash} className="btn btn-ghost btn-sm">
            Recycle {appraiser ? '· $25 ea' : '· $0'}
          </button>
        )}
      </div>
    </Panel>
  )
}
