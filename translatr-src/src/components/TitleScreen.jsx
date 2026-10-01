import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { ENDINGS, fmtRunTime } from '../data/endings'
import { DailyCard } from './Daily'
import { rogueTargets } from '../data/rogue'

/** The title screen: shown on a brand-new save (first visit, "Reset all", or a new game). */
export default function TitleScreen() {
  const open = useGameStore((s) => !s.mode && !s.resetting)
  return (
    <Modal open={open} z={490} backdrop="bg-[#041a33]/75">
      <TitleBody />
    </Modal>
  )
}

function TitleBody() {
  const records = useGameStore((s) => s.records)
  const rogueRecord = records.rogue
  const endings = useGameStore((s) => s.endings)
  const { chooseMode, openEndings } = useGameStore.getState()
  const found = ENDINGS.filter((e) => endings[e.id]).length
  const rogueReady = rogueTargets({ endings }).length > 0

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="title-heading" className="modal-card max-h-[92vh] w-[min(1100px,94vw)] overflow-y-auto p-6 text-center" style={{ '--accent': '#3da6e8' }}>
      <div className="title-logo mx-auto mb-3" aria-hidden="true">
        T
      </div>
      <h1 id="title-heading" className="brand-title text-3xl">
        TRANSLATR<span className="align-top text-base">™</span> <span className="brand-edition">Ultra+ Pro Max</span>
      </h1>
      <p className="mt-1 text-sm text-ink/55">The world’s most monetized translator. Nine endings. Zero refunds. Pick how you’d like to suffer.</p>

      <div className="mt-5 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
        <ModeCard
          icon="🌐"
          title="Normal"
          accent="#3da6e8"
          points={['The full experience: cookies, tutorial, daily guilt', 'Play at your own pace (we have ads for that)', 'Every ending, every achievement']}
          cta="Start"
          btn="btn-gold"
          onClick={() => chooseMode('normal')}
        />
        <ModeCard
          icon="⏱️"
          title="Speedrun"
          accent="#c42e86"
          points={['Timer on, splits on, personal bests saved', 'No tutorial. Every cookie accepted for you', 'Any ending stops the clock. Any% is legal']}
          cta="Start the clock"
          btn="btn-magenta"
          onClick={() => chooseMode('speedrun')}
        />
        <DailyCard onStart={() => chooseMode('daily')} />
        <ModeCard
          icon="🎲"
          title="Roguelike"
          accent="#8e5bd6"
          points={['3 random perks, 3 random debuffs', 'One ending you have to reach again (one you’ve already done)', 'Any other ending loses the run']}
          cta={!rogueReady ? '🔒 Finish any ending first' : rogueRecord ? `Roll a run · ${rogueRecord.wins}/${rogueRecord.runs} won` : 'Roll a run'}
          btn="btn-magenta"
          disabled={!rogueReady}
          onClick={() => chooseMode('rogue')}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.71875rem] text-ink/55">
        <button className="underline decoration-dotted hover:text-ink" onClick={openEndings}>
          🏁 Endings found: {found}/{ENDINGS.length}
        </button>
        <span>⏱️ Speedrun PB: {records.best?.any != null ? fmtRunTime(records.best.any) : 'none yet'}</span>
        {records.runs > 0 && (
          <span>
            {records.runs} speedrun{records.runs === 1 ? '' : 's'} finished
          </span>
        )}
      </div>
    </div>
  )
}

function ModeCard({ icon, title, accent, points, cta, btn, onClick, disabled }) {
  return (
    <div className="inset-card flex flex-col p-4" style={{ '--accent': accent }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-lg font-semibold">{title}</span>
      </div>
      <ul className="mb-4 flex-1 space-y-1 text-[0.78125rem] text-ink/65">
        {points.map((p) => (
          <li key={p}>· {p}</li>
        ))}
      </ul>
      <button className={`btn ${btn} w-full py-2.5`} onClick={onClick} disabled={disabled}>
        {cta}
      </button>
    </div>
  )
}
