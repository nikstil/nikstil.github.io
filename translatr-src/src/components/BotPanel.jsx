import Panel from './Panel'
import { useGameStore, getTableLimit, getBotPrice } from '../store/useGameStore'
import { BOT_GREED, BOT_PATIENCE } from '../data/gameData'
import { money } from '../lib/format'

/** Unlocked after the first Prestige. The bot itself is driven by the game loop. */
export default function BotPanel() {
  const prestige = useGameStore((s) => s.prestige)
  const bot = useGameStore((s) => s.bot)
  const botsLost = useGameStore((s) => s.stats.botsLost ?? 0)
  const limit = useGameStore(getTableLimit)
  const price = useGameStore(getBotPrice)
  const { buyBot, updateBot, collectBot } = useGameStore.getState()

  if (prestige < 1 && !bot) return null

  if (!bot) {
    return (
      <Panel title="Bot Rental" icon="🤖" accent="#3da6e8" badge="New">
        <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-[radial-gradient(circle,rgba(61,232,255,.2),transparent_70%)] text-6xl">🤖</div>
        <p className="mb-4 text-sm leading-relaxed text-ink/60">
          A bot that mines or gambles for you, 24/7*. It holds the profits until you collect. Leave {BOT_PATIENCE} clicks uncollected, or let it win{' '}
          {BOT_GREED}× its bet at the roulette, and it takes everything and leaves.
        </p>
        {botsLost > 0 && <p className="mb-3 text-sm font-semibold text-blood">Bots that have robbed you: {botsLost}</p>}
        <button onClick={buyBot} className="btn btn-gold w-full">
          Hire bot · {money(price)}
        </button>
        <p className="mt-2 text-center text-[0.625rem] text-ink/30">*While this tab is open.</p>
      </Panel>
    )
  }

  const chip = Math.min(bot.chip, limit) // it plays at the same table as you
  const gambling = bot.mode === 'gamble'
  const won = (bot.won ?? 0) / chip // winnings so far, in bets
  const patience = Math.min(1, gambling ? won / BOT_GREED : bot.actions / BOT_PATIENCE)
  const mood = patience >= 0.8 ? '😈' : patience >= 0.5 ? '😒' : '🙂'
  const barColor = patience >= 0.8 ? '#ff3b5c' : patience >= 0.5 ? '#ffcf3f' : '#39ff14'

  return (
    <Panel title={bot.name} icon="🤖" accent="#3da6e8" badge={bot.running ? '● Working' : 'Idle'}>
      <div className={`mb-3 flex items-center justify-center gap-3 text-6xl ${patience >= 0.8 ? 'animate-shake' : ''}`}>
        <span className={bot.running ? 'animate-wiggle' : ''}>🤖</span>
        <span className="text-4xl">{mood}</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-inset/40 p-1">
        {[
          ['mine', '⛏️ Mine'],
          ['gamble', '🎰 Gamble'],
        ].map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => updateBot({ mode })}
            className={`rounded-lg py-1.5 font-display text-sm font-semibold transition ${bot.mode === mode ? 'bg-ice/15 text-ice shadow-[inset_0_0_0_1px_#3de8ff66]' : 'text-ink/50 hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {bot.mode === 'gamble' && (
        <div className="mb-3 text-sm" style={{ '--accent': '#3de8ff' }}>
          <div className="flex items-center gap-2">
            <span className="label shrink-0">Bet/spin</span>
            <input
              type="number"
              min={1}
              max={limit}
              value={chip}
              onChange={(e) => updateBot({ chip: Math.max(1, Math.min(limit, Math.floor(Number(e.target.value) || 1))) })}
              className="input py-1.5"
            />
            <button onClick={() => updateBot({ chip: limit })} className="btn btn-ghost btn-sm shrink-0" title="Bet the table limit">
              Max
            </button>
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-ink/40">
            Table limit {money(limit)} (Prestige raises it). Bets YOUR wallet on red every second. Losses are yours. Wins go in its pocket.
          </p>
          {bot.waiting && <p className="text-[0.6875rem] font-semibold text-blood">Waiting for you to afford its gambling habit…</p>}
        </div>
      )}

      <div className="inset-card mb-3 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-ink/50">Uncollected loot</span>
          <b className="font-mono glow-toxic">{money(bot.pot)}</b>
        </div>
        <div className="mt-2 flex justify-between text-[0.6875rem] text-ink/50">
          <span>{gambling ? 'Greed' : 'Patience'}</span>
          <span className="font-mono">{gambling ? `won ${Math.floor(won)}× / ${BOT_GREED}× its bet` : `${bot.actions}/${BOT_PATIENCE} clicks`}</span>
        </div>
        <div className="meter mt-1" style={{ '--bar': barColor }}>
          <span style={{ width: `${patience * 100}%` }} />
        </div>
        {patience >= 0.8 && <p className="mt-2 text-[0.6875rem] font-semibold text-blood">⚠ {bot.name} is looking up flights to Ibiza…</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => updateBot({ running: !bot.running })} className="btn btn-ghost">
          {bot.running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button onClick={collectBot} className={`btn btn-toxic ${patience >= 0.8 ? 'animate-wiggle' : ''}`}>
          Collect
        </button>
      </div>
    </Panel>
  )
}
