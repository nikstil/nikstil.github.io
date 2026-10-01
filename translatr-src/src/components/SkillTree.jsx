import { Fragment } from 'react'
import Panel from './Panel'
import { useGameStore, skillStatus } from '../store/useGameStore'
import { SKILLS, SKILL_BRANCHES } from '../data/gameData'

const STATUS_LABEL = { owned: 'Learned', available: 'Learn', poor: 'Need points', locked: 'Locked' }

/** Only rendered after the player's first Prestige. */
export default function SkillTree() {
  const skillPoints = useGameStore((s) => s.skillPoints)
  const skills = useGameStore((s) => s.skills)
  const prestige = useGameStore((s) => s.prestige)
  const { buySkill, respecSkills } = useGameStore.getState()

  if (prestige === 0 && skillPoints === 0 && Object.keys(skills).length === 0) return null

  const state = { skillPoints, skills }
  const capstones = SKILLS.filter((k) => k.branch === 'capstone')
  const learned = Object.keys(skills).length

  const node = (skill, accent) => {
    const status = skillStatus(state, skill)
    const styles = {
      owned: { borderColor: accent, boxShadow: `0 0 26px -8px ${accent}, inset 0 0 30px -18px ${accent}` },
      available: { borderColor: `${accent}99`, '--glow': accent },
      poor: {},
      locked: {},
    }[status]
    return (
      <button
        key={skill.id}
        onClick={() => status === 'available' && buySkill(skill.id)}
        title={skill.desc}
        className={`w-full surface-soft rounded-md border p-3 text-left transition duration-300 ${
          status === 'available' ? 'animate-glow-pulse hover:-translate-y-0.5 hover:bg-ink/[0.04]' : ''
        } ${status === 'locked' ? 'border-ink/5 opacity-40 grayscale' : status === 'poor' ? 'border-ink/10 opacity-70' : ''}`}
        style={styles}
        disabled={status !== 'available'}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{skill.emoji}</span>
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold leading-tight">{skill.name}</div>
            <div className="text-[0.6875rem] leading-snug text-ink/50">{skill.desc}</div>
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[0.6875rem] font-semibold">
          <span style={{ color: status === 'owned' || status === 'available' ? accent : undefined }} className={status === 'locked' || status === 'poor' ? 'text-ink/40' : ''}>
            {status === 'locked' ? '🔒 ' : status === 'owned' ? '✓ ' : ''}
            {STATUS_LABEL[status]}
          </span>
          <span className="text-ink/50">
            {skill.cost} pt{skill.cost > 1 ? 's' : ''}
          </span>
        </div>
      </button>
    )
  }

  const connector = (lit, accent) => (
    <div className="mx-auto h-5 w-0.5 rounded transition" style={{ background: lit ? accent : 'rgba(27,42,58,.15)', boxShadow: lit ? `0 0 8px ${accent}` : 'none' }} />
  )

  return (
    <Panel
      title="Ascension Tree"
      icon="🌳"
      accent="#9b6bd6"
      bodyClassName="p-5"
      right={
        <>
          <span className="badge" style={{ '--accent': '#d08a00' }}>
            ★ {skillPoints} pts
          </span>
          <button onClick={respecSkills} disabled={Object.keys(skills).length === 0} className="btn btn-ghost btn-sm">
            Respec
            <span className="max-sm:hidden">
              {' '}
              <s className="text-blood">$9.99</s> FREE
            </span>
          </button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink/50">
        <span className="min-w-0 flex-1">
          {learned}/{SKILLS.length} learned · Prestige #n grants n+1 points · survives Prestige · does not survive the Trap Ad
        </span>
        <button onClick={() => useGameStore.getState().startCheckout('skill_points')} className="btn btn-magenta btn-sm" title="Skill Issue Fix™: +3 skill points">
          🎓 Skill Issue Fix™ · +3 pts · $3.99
        </button>
      </div>

      <div className="@container">
      <div className="grid gap-5 @min-[520px]:grid-cols-2 @min-[960px]:grid-cols-4">
        {SKILL_BRANCHES.map((branch) => {
          const branchSkills = SKILLS.filter((k) => k.branch === branch.id)
          return (
            <div key={branch.id}>
              <div className="mb-3 text-center text-sm font-semibold" style={{ color: branch.accent }}>
                {branch.emoji} {branch.name}
              </div>
              {branchSkills.map((skill, i) => (
                <Fragment key={skill.id}>
                  {i > 0 && connector(!!skills[branchSkills[i - 1].id], branch.accent)}
                  {node(skill, branch.accent)}
                </Fragment>
              ))}
            </div>
          )
        })}
      </div>
      </div>

      <div className="mt-6">
        <div className="label mb-2 text-center">— Capstones —</div>
        <div className="@container">
          <div className="mx-auto grid max-w-2xl gap-3 @min-[520px]:grid-cols-2">
            {capstones.map((c, i) => (
              <div key={c.id}>{node(c, i ? '#7a4bd6' : '#d08a00')}</div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
