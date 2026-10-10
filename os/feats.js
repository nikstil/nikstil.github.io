// Little things you've done around BloatOS (and the phone apps), for achievements: flags and
// counters in one object in this site's storage. Any page can import it.

const KEY = 'nikstilos-feats'
export function feats() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}
/** Sets a flag (feat('bsod')), adds to a counter (feat('bonks', 1)), or keeps a maximum (feat('best', 9, 'max')). */
export function feat(name, value = true, how = 'add') {
  const f = feats()
  if (value === true) f[name] = true
  else if (how === 'max') f[name] = Math.max(f[name] ?? 0, value)
  else f[name] = (typeof f[name] === 'number' ? f[name] : 0) + value
  try {
    localStorage.setItem(KEY, JSON.stringify(f))
  } catch {}
  return f[name]
}
