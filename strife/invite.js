// Inviting friends from nikstil Messenger into the online game you're hosting. The invite is an
// ordinary message with a link (nikstil.com/strife/?join=CODE): Messenger turns it into a card with
// a Join button, and anywhere else it's still a link that works.

const $ = (s, el = document) => el.querySelector(s)
const online = () => window.nikstilOnline ?? null
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const inviteText = (code) => `💣 Come play COUNTER-STRIFE with me! Join my game: https://nikstil.com/strife/?join=${code} (code ${code})`
export const isUserId = (v) => UUID.test(String(v ?? ''))

/** env: { code() → the game code while hosting, or null } */
export function initInvites({ code }) {
  const box = $('#invite')
  const sent = new Set()

  async function signedIn() {
    try {
      return (await online()?.me()) ?? null
    } catch {
      return null
    }
  }
  /** Sends the invite to one player (by id). Returns an error message, or ''. */
  async function sendTo(userId) {
    const c = code()
    if (!c) return 'Host a game first.'
    if (!(await signedIn())) return 'Sign in to nikstil.com (on the desktop) to invite people from Messenger.'
    try {
      await online().send(userId, inviteText(c))
      sent.add(userId)
      return ''
    } catch (e) {
      return online().errorText(e)
    }
  }

  /** The picker: people you've talked to, or anyone by username. */
  async function open() {
    box.hidden = false
    box.innerHTML = `<div class="trade-card invite-card"><h3>📨 Invite friends</h3><p class="invite-note"></p><ul class="invite-list"><li class="muted">Loading…</li></ul>
      <form class="invite-find"><input placeholder="Or type a username" maxlength="20" autocomplete="off" spellcheck="false"><button class="go small">Invite</button></form>
      <button class="ghost" data-invite="close">Done</button></div>`
    const note = $('.invite-note', box)
    const list = $('.invite-list', box)
    const c = code()
    note.textContent = c ? `They get a message in nikstil Messenger with a Join button (game code ${c}).` : 'Host a game first.'
    const me = await signedIn()
    if (!me) {
      list.innerHTML = '<li class="muted">Sign in to nikstil.com (on the desktop) to invite people from Messenger. Or just tell them the code.</li>'
      $('.invite-find', box).hidden = true
      return
    }
    let people = []
    try {
      people = (await online().conversations()).filter((p) => !p.blocked).slice(0, 12)
    } catch (e) {
      list.innerHTML = ''
      list.append(Object.assign(document.createElement('li'), { className: 'muted', textContent: online().errorText(e) }))
    }
    if (people.length) list.replaceChildren(...people.map((p) => row({ id: p.user_id, username: p.username })))
    else if (!list.children.length || list.textContent === 'Loading…') list.innerHTML = '<li class="muted">No chats yet: type a username below.</li>'
    $('.invite-find', box).addEventListener('submit', async (e) => {
      e.preventDefault()
      const input = $('.invite-find input', box)
      const name = input.value.trim()
      if (!name) return
      const p = await online()
        .findPlayer(name)
        .catch(() => null)
      if (!p || p.id === me.id) return (note.textContent = p ? 'That’s you!' : `Nobody called “${name}”.`)
      input.value = ''
      const li = row({ id: p.id, username: p.username })
      list.prepend(li)
      $('button', li).click()
    })
  }
  function row(p) {
    const li = document.createElement('li')
    li.innerHTML = '<span></span><button class="go small">Invite</button>'
    $('span', li).textContent = p.username
    const b = $('button', li)
    if (sent.has(p.id)) {
      b.disabled = true
      b.textContent = 'Sent ✓'
    }
    b.addEventListener('click', async () => {
      b.disabled = true
      b.textContent = 'Sending…'
      const err = await sendTo(p.id)
      b.textContent = err ? 'Try again' : 'Sent ✓'
      b.disabled = !err
      if (err) $('.invite-note', box).textContent = err
    })
    return li
  }
  function close() {
    box.hidden = true
  }
  box.addEventListener('click', (e) => e.target.closest('[data-invite="close"]') && close())
  return { open, close, sendTo }
}
