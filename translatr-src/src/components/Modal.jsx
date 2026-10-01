import { createPortal } from 'react-dom'
import { usePresence } from '../lib/hooks'

/**
 * Buttery modal: blurred backdrop, spring-in, and a real exit animation.
 * Portaled to <body> so transformed ancestors can't break position:fixed.
 */
export default function Modal({ open, onBackdrop, z = 300, backdrop = 'bg-[#06264d]/40', className = '', children }) {
  const { mounted, closing } = usePresence(open)
  if (!mounted) return null
  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 backdrop-blur-md ${backdrop} ${closing ? 'anim-backdrop-out pointer-events-none' : 'anim-backdrop-in'}`}
      style={{ zIndex: z }}
      onMouseDown={(e) => e.target === e.currentTarget && onBackdrop?.()}
    >
      <div className={`${closing ? 'anim-modal-out' : 'anim-modal-in'} ${className}`}>{children}</div>
    </div>,
    document.body,
  )
}
