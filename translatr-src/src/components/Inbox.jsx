import { useMemo, useState } from 'react'
import Panel from './Panel'
import { useGameStore } from '../store/useGameStore'
import { MAIL_FOLDERS, mailFolderOf, mailTemplate, resolve } from '../data/mail'
import { focusWindow } from '../lib/windowFx'

const PAYWALL = 'Sending email requires TRANSLATR™ Mail Premium ($2.99/mo). Receiving is free. Forever. Constantly.'

/** 3m · 2h · Tue */
function ago(ms, at) {
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(at).toLocaleDateString([], { weekday: 'short' })
}

/** TRANSLATR™ Mail: the story (and every ending's hint) arrives here, along with a lot of spam. */
export default function Inbox() {
  const mail = useGameStore((s) => s.mail)
  // "5m", "2h": nothing here changes faster than once a minute.
  const clock = useGameStore((s) => Math.floor(s.clock / 60_000) * 60_000)
  const [folder, setFolder] = useState('inbox')
  const [openKey, setOpenKey] = useState(null)
  const { readMail, markAllMailRead, toast } = useGameStore.getState()

  const byFolder = useMemo(() => {
    const groups = Object.fromEntries(MAIL_FOLDERS.map((f) => [f.id, []]))
    for (const m of mail) groups[mailFolderOf(m)]?.push(m)
    return groups
  }, [mail])
  const list = byFolder[folder] ?? []
  const unread = (id) => (byFolder[id] ?? []).filter((m) => !m.read).length
  const inboxUnread = unread('inbox')
  const open = mail.find((m) => m.key === openKey && mailFolderOf(m) === folder) ?? null

  const select = (m) => {
    setOpenKey(m.key)
    readMail(m.key)
  }

  return (
    <Panel id="win-mail" title="Inbox — TRANSLATR™ Mail" icon="📧" accent="#2f7fd0" badge={inboxUnread ? `${inboxUnread} unread` : undefined} bodyClassName="p-0">
      <div className="flex flex-wrap items-center gap-1 border-b border-ink/10 px-2 py-1.5">
        {MAIL_FOLDERS.map((f) => (
          <button
            key={f.id}
            className={`doom-tab-btn ${folder === f.id ? 'active' : ''}`}
            onClick={() => {
              setFolder(f.id)
              setOpenKey(null)
            }}
          >
            {f.icon} {f.label}
            {unread(f.id) > 0 && <b className="ml-1 font-mono text-[0.625rem] text-blood">{unread(f.id)}</b>}
          </button>
        ))}
        <span className="flex-1" />
        <button className="btn btn-ghost btn-sm" disabled={!list.some((m) => !m.read)} onClick={() => markAllMailRead(list.map((m) => m.key))}>
          ✓ Mark all read
        </button>
        <button className="btn btn-sm" onClick={() => toast(`✏️ ${PAYWALL}`, 'info')}>
          ✏️ New
        </button>
      </div>

      <div className="@container">
        <div className="grid min-h-[18rem] @min-[560px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* The list (hidden on narrow windows while a message is open) */}
          <ul className={`max-h-[26rem] overflow-y-auto border-ink/10 @min-[560px]:border-r ${open ? '@max-[559px]:hidden' : ''}`}>
            {list.length === 0 && (
              <li className="p-6 text-center text-[0.8125rem] text-ink/50">
                {folder === 'spam' ? 'No spam yet. Give it a minute.' : folder === 'deleted' ? 'Nothing deleted. Everything is kept forever anyway.' : 'Nothing here yet. It’s coming.'}
              </li>
            )}
            {list.map((m) => {
              const t = mailTemplate(m)
              if (!t) return null
              const subject = resolve(t.subject, m.data)
              const preview = resolve(t.body, m.data)?.[0] ?? ''
              return (
                <li key={m.key}>
                  <button
                    onClick={() => select(m)}
                    className={`mail-row w-full border-b border-ink/[0.06] px-3 py-2 text-left ${m.key === openKey ? 'is-open' : ''} ${m.read ? '' : 'is-unread'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[0.75rem]">
                      {!m.read && <span className="mail-dot" aria-label="unread" />}
                      <span className={`min-w-0 flex-1 truncate ${m.read ? 'text-ink/70' : 'font-bold text-ink'}`}>{resolve(t.from, m.data)}</span>
                      {t.important && <span className="text-[0.6875rem] font-bold text-blood" title="Marked important by the sender">!</span>}
                      {t.attachment && <span title="Attachment">📎</span>}
                      <span className="shrink-0 font-mono text-[0.625rem] text-ink/40">{ago(clock - m.at, m.at)}</span>
                    </div>
                    <div className={`truncate text-[0.78125rem] ${m.read ? 'text-ink/75' : 'font-semibold text-ink'}`}>{subject}</div>
                    <div className="truncate text-[0.6875rem] text-ink/45">{preview}</div>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className={`min-w-0 ${open ? '' : '@max-[559px]:hidden'}`}>
            {open ? <Reader m={open} onBack={() => setOpenKey(null)} /> : <EmptyReader count={list.length} />}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function EmptyReader({ count }) {
  return (
    <div className="grid h-full min-h-[14rem] place-items-center p-6 text-center text-[0.8125rem] text-ink/45">
      <div>
        <div className="mb-2 text-4xl">📬</div>
        {count ? 'Select a message to read it. Or don’t. They’ll keep coming.' : 'Your inbox is quiet. It is never quiet for long.'}
      </div>
    </div>
  )
}

function Reader({ m, onBack }) {
  const t = mailTemplate(m)
  const { deleteMail, markMailUnread, mailAction, toast, restoreWindow, openUnwrapped, openEndings, openTrophies, openSettings } = useGameStore.getState()
  if (!t) return null
  const subject = resolve(t.subject, m.data)
  const body = resolve(t.body, m.data) ?? []
  const deleted = mailFolderOf(m) === 'deleted'

  const run = (action) => {
    const [kind, arg] = action.split(':')
    if (kind === 'focus') return focusWindow(arg, restoreWindow, useGameStore.getState().layout.minimized.includes(arg))
    if (kind === 'open') return { unwrapped: openUnwrapped, endings: openEndings, trophies: openTrophies, settings: openSettings, shooter: useGameStore.getState().openShooter, arcade: () => useGameStore.getState().openArcade() }[arg]?.()
    mailAction(m.key, action)
  }

  return (
    <article className="flex h-full max-h-[26rem] flex-col">
      <header className="border-b border-ink/10 px-4 py-3">
        <button className="mb-1 text-[0.6875rem] text-ink/50 hover:text-ink @min-[560px]:hidden" onClick={onBack}>
          ← Back
        </button>
        <h3 className="text-[0.9375rem] font-semibold leading-snug">{subject}</h3>
        <div className="mt-1 text-[0.71875rem] text-ink/60">
          <b className="text-ink/80">{resolve(t.from, m.data)}</b> &lt;{t.addr}&gt;{t.role && ` · ${t.role}`}
        </div>
        <div className="text-[0.6875rem] text-ink/45">
          To: you · {new Date(m.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3 text-[0.8125rem] leading-relaxed text-ink/85">
        {body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {t.attachment && (
          <div className="inline-flex items-center gap-2 rounded-md border border-ink/15 bg-ink/[0.03] px-2.5 py-1.5 font-mono text-[0.71875rem]">
            📎 {t.attachment} <span className="text-ink/40">· 4 KB · definitely safe</span>
          </div>
        )}
      </div>
      <footer className="flex flex-wrap items-center gap-1.5 border-t border-ink/10 px-3 py-2">
        {t.actions?.map((a) => {
          const oneShot = !/^(focus|open|checkout):/.test(a.do)
          const used = oneShot && m.done
          return (
            <button key={a.label} className={`btn btn-sm ${used ? 'btn-ghost' : a.do === 'phish' || a.do === 'virus' ? 'btn-gold' : 'btn-magenta'}`} disabled={used} onClick={() => run(a.do)}>
              {used && m.done === a.do ? '✓ ' : ''}
              {a.label}
            </button>
          )
        })}
        <span className="flex-1" />
        <button className="btn btn-ghost btn-sm" onClick={() => toast(`↩️ ${PAYWALL}`, 'info')} title="Reply">
          ↩️
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => markMailUnread(m.key)} title="Mark as unread">
          ✉️
        </button>
        <button
          className="btn btn-ghost btn-sm"
          title={deleted ? 'Delete forever' : 'Delete'}
          onClick={() => {
            if (deleted) return toast('🗑️ Permanently deleting email requires TRANSLATR™ Mail Premium ($2.99/mo). It is safe with us. Forever.', 'info')
            deleteMail(m.key)
            onBack()
          }}
        >
          🗑️
        </button>
      </footer>
    </article>
  )
}
