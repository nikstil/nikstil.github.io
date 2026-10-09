// The chat box and the radio menus on the HUD. Y: say to everyone, U: to your team (Enter sends,
// Esc cancels). Z and X: the radio menus (Z/X again for the next menu, 1-7 to say it, 0 to close).
// Lines come from the game's 'chat' and 'radio' events, so bots and online players show up the same.

import { RADIO, RADIO_MENUS, radioText } from './radio.js'

const $ = (s) => document.querySelector(s)
const MENU_ORDER = ['z', 'x', 'c']
const KEEP = 10 // seconds a line stays up

/**
 * env: { game(), net(), playing(), settings, audio, onOpen(), onClose() }
 * (onOpen/onClose: the chat box takes the keyboard while it's open)
 */
export function initChat(env) {
  const box = $('#chat')
  const log = $('#chat-log')
  const form = $('#chat-form')
  const input = $('#chat-in')
  const menuEl = $('#radio-menu')
  let typingTeam = null // null: closed; false: all chat; true: team chat
  let menu = null // 'z' | 'x' | 'c' while a radio menu is open
  let closedAt = 0 // (Esc also lets go of the mouse: that shouldn't pause the game)

  // ---------------- The log
  function line(kind, d) {
    const g = env.game()
    const me = g?.player
    // team lines (and the radio) are for that team only (the host's own screen sees every event)
    if (d.team && (!me || d.team !== me.team)) return
    const li = document.createElement('li')
    li.className = 'is-' + kind
    li.dataset.at = String(performance.now())
    if (kind === 'chat') {
      if (d.dead) li.append(tag('*DEAD*', 'dead'))
      if (d.team) li.append(tag('(Team)', 'to'))
      li.append(who(d.a), document.createTextNode(': ' + d.text))
    } else {
      li.append(tag('📻', 'ico'), who(d.a), document.createTextNode(': ' + radioText(d.id, d.place)))
      if (d.a !== me) env.audio.play('radio', { gain: 0.5 })
      speak(d)
    }
    log.append(li)
    while (log.children.length > 14) log.firstChild.remove()
  }
  const tag = (t, c) => {
    const s = document.createElement('span')
    s.className = c
    s.textContent = t + ' '
    return s
  }
  const who = (a) => {
    const s = document.createElement('b')
    s.className = a?.team ?? ''
    s.textContent = a?.name ?? '?'
    return s
  }
  // a radio line out loud (the browser's speech voices), if there are any and it's switched on
  function speak(d) {
    if (!env.settings.radioVoice || env.audio.isMuted() || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return
    try {
      const u = new SpeechSynthesisUtterance(radioText(d.id, d.place))
      u.rate = 1.15
      u.pitch = 0.7 + ((d.a?.id ?? 0) % 5) * 0.12
      u.volume = 0.7
      if (speechSynthesis.pending) speechSynthesis.cancel()
      speechSynthesis.speak(u)
    } catch {}
  }
  /** Lines fade after a while (all of them come back while you type). */
  function tick() {
    const now = performance.now()
    for (const li of log.children) li.classList.toggle('old', now - Number(li.dataset.at) > KEEP * 1000)
  }
  function clear() {
    log.replaceChildren()
    closeChat()
    closeRadio()
  }

  // ---------------- Typing
  function openChat(team) {
    if (!env.playing()) return
    closeRadio()
    typingTeam = !!team
    $('#chat-to').textContent = team ? 'Team:' : 'All:'
    form.hidden = false
    box.classList.add('typing')
    input.value = ''
    env.onOpen()
    input.focus()
  }
  function closeChat() {
    if (typingTeam === null) return
    typingTeam = null
    closedAt = performance.now()
    form.hidden = true
    box.classList.remove('typing')
    input.blur()
    env.onClose()
  }
  function send(text, team) {
    const g = env.game()
    const me = g?.player
    text = text.trim()
    if (!me || !text) return
    if (g.client) env.net()?.sendChat(text, team)
    else g.chat(me, text, team)
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const team = typingTeam
    const text = input.value
    closeChat()
    send(text, team)
  })
  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      closeChat()
    }
  })

  // ---------------- The radio
  function openRadio(which) {
    if (!env.playing()) return
    const me = env.game()?.player
    if (!me?.alive) return
    menu = which
    const m = RADIO_MENUS[which]
    menuEl.hidden = false
    menuEl.innerHTML = `<h4>📻 ${m.name}</h4><ol></ol><p>${MENU_ORDER.map((k) => `<button data-radio-menu="${k}" class="${k === which ? 'on' : ''}">${RADIO_MENUS[k].name}</button>`).join('')}</p><small>Z / X: next menu · 0: close</small>`
    const ol = menuEl.querySelector('ol')
    m.ids.forEach((id, k) => {
      const li = document.createElement('li')
      const b = document.createElement('button')
      b.dataset.radio = id
      b.innerHTML = `<kbd>${k + 1}</kbd>`
      b.append(RADIO[id].text)
      li.append(b)
      ol.append(li)
    })
  }
  function closeRadio() {
    if (menu) closedAt = performance.now()
    menu = null
    menuEl.hidden = true
  }
  function sendRadio(id) {
    const g = env.game()
    const me = g?.player
    closeRadio()
    if (!me?.alive) return
    if (g.client) env.net()?.sendRadio(id)
    else g.radio(me, id)
  }
  menuEl.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    e.preventDefault()
    e.stopPropagation()
    if (b.dataset.radio) sendRadio(b.dataset.radio)
    else if (b.dataset.radioMenu) openRadio(b.dataset.radioMenu)
  })

  /** A key while playing: true when the chat or the radio took it. */
  function key(e) {
    if (typingTeam !== null) return true
    if (menu) {
      if (/^Digit[1-9]$/.test(e.code) || /^Numpad[1-9]$/.test(e.code)) {
        const id = RADIO_MENUS[menu].ids[Number(e.code.slice(-1)) - 1]
        if (id) sendRadio(id)
        return true
      }
      if (e.code === 'Digit0' || e.code === 'Numpad0' || e.code === 'Escape') {
        closeRadio()
        return true
      }
      if (e.code === 'KeyZ' || e.code === 'KeyX') {
        const next = MENU_ORDER[MENU_ORDER.indexOf(menu) + 1]
        if (next) openRadio(next)
        else closeRadio()
        return true
      }
    }
    if (e.repeat) return false
    if (e.code === 'KeyY' || e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault()
      openChat(false)
      return true
    }
    if (e.code === 'KeyU') {
      e.preventDefault()
      openChat(true)
      return true
    }
    if (e.code === 'KeyZ' || e.code === 'KeyX') {
      openRadio(e.code === 'KeyZ' ? 'z' : 'x')
      return true
    }
    return false
  }

  return {
    chat: (d) => line('chat', d),
    radio: (d) => line('radio', d),
    key,
    tick,
    clear,
    openChat,
    toggleRadio: () => (menu ? closeRadio() : openRadio('z')),
    closeAll: () => {
      closeChat()
      closeRadio()
    },
    get typing() {
      return typingTeam !== null
    },
    get radioOpen() {
      return !!menu
    },
    /** Open, or just closed (with Esc, which also frees the mouse). */
    get busy() {
      return typingTeam !== null || !!menu || performance.now() - closedAt < 700
    },
  }
}
