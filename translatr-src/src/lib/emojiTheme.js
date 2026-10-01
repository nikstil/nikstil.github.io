import { THEME_EMOJI } from '../data/themeEmoji'
import { translateText } from './language'

// The text layer: re-skins every emoji on the page for the current theme and puts every text in
// the chosen interface language (lib/language.js), including text that comes from data (toasts,
// ads, feed posts), without every component having to know about themes or languages.
// It rewrites text nodes in place and remembers each node's original text, so switching theme or
// language (or back to Aero and English) always works from the source, never from rewritten text.
// React only ever *writes* text nodes (it never reads them back), so this is safe: when React
// changes a text, the observer sees the new original and maps that instead.
// Anything inside translate="no" keeps its language (its emoji still follow the theme).

const strip = (s) => s.replace(/\uFE0F/g, '')
const TABLE = new Map(Object.entries(THEME_EMOJI).map(([emoji, forTheme]) => [strip(emoji), forTheme]))
const escape = (ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Longest first (so 🐈‍⬛ wins over 🐈), with optional variation selectors (⚖ vs ⚖\uFE0F).
const PATTERN = new RegExp(
  [...TABLE.keys()]
    .sort((a, b) => b.length - a.length)
    .map((key) => [...key].map(escape).join('\uFE0F?') + '\uFE0F?')
    .join('|'),
  'gu',
)
// Cheap pre-check: every mapped emoji uses a surrogate pair or a symbol in U+2000–U+2BFF / U+3030.
const MAYBE_EMOJI = /[\u2000-\u2bff\u3030\ud800-\udbff]/
const LETTER = /[A-Za-z]/
// <option> text is also its value, so it's never rewritten.
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'SELECT', 'OPTION'])
// text node -> the text React (or data) actually put there. Module-level so a restarted
// observer (StrictMode, hot reload) still knows the originals of nodes it already rewrote.
const originals = new WeakMap()

// Themes with their own emoji set (the others, like Aero, keep the originals).
const EMOJI_THEMES = new Set(['y2k', 'skeuo', 'minimal', 'retro'])

/** `text` with every known emoji swapped for the theme's version (Aero and the OS themes: unchanged). */
export function themeEmoji(text, theme) {
  if (!EMOJI_THEMES.has(theme) || !MAYBE_EMOJI.test(text)) return text
  return text.replace(PATTERN, (m) => TABLE.get(strip(m))?.[theme] ?? m)
}

/** Starts the text layer. Returns { setTheme, setLanguage, stop }. */
export function startTextLayer({ theme: initialTheme = 'luna', language: initialLanguage = 'en' } = {}) {
  let theme = initialTheme
  let language = initialLanguage

  const apply = (node) => {
    const parent = node.parentNode
    if (!parent || SKIP.has(parent.nodeName)) return
    const known = originals.has(node)
    const raw = known ? originals.get(node) : node.nodeValue
    // Nothing to do for text we never changed that has no emoji and (in English) no words to translate.
    if (!known && !MAYBE_EMOJI.test(raw) && (language === 'en' || !LETTER.test(raw))) return
    if (!known) originals.set(node, raw)
    const lang = language !== 'en' && parent.closest?.('[translate="no"]') ? 'en' : language
    const next = themeEmoji(translateText(raw, lang), theme)
    if (node.nodeValue !== next) node.nodeValue = next
  }
  const applyAll = (root) => {
    if (root.nodeType === Node.TEXT_NODE) return apply(root)
    if (root.nodeType !== Node.ELEMENT_NODE || SKIP.has(root.nodeName)) return
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) apply(n)
  }

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') {
        // Our own writes are discarded below, so this is a fresh original.
        originals.set(r.target, r.target.nodeValue)
        apply(r.target)
      } else r.addedNodes.forEach(applyAll)
    }
    observer.takeRecords() // drop the records our own rewrites just produced
  })
  observer.observe(document.body, { subtree: true, childList: true, characterData: true })
  if (language !== 'en') document.documentElement.lang = language === 'latin' ? 'la' : 'en'
  applyAll(document.body)
  observer.takeRecords()

  return {
    setTheme(next) {
      if (next === theme) return
      theme = next
      applyAll(document.body)
      observer.takeRecords()
    },
    setLanguage(next) {
      if (next === language) return
      language = next
      document.documentElement.lang = next === 'latin' ? 'la' : 'en'
      applyAll(document.body)
      observer.takeRecords()
    },
    stop() {
      observer.disconnect()
    },
  }
}
