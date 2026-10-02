/**
 * LAWN OF THE DEAD and BRAINS FIRST on the phone: the nikstil.com games in a frame, with the phone
 * turned sideways (they keep their own saves, the same ones as on nikstil.com). TRANSLATR™ stays
 * paused underneath.
 */
export default function EmbeddedGame({ game }) {
  return <iframe className="phone-embed" src={game.src} title={game.name} allow="fullscreen; autoplay" />
}
