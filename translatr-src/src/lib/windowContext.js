import { createContext, useContext } from 'react'

/**
 * Provided by WindowGrid to each window it hosts: `{ onPointerDown, onMinimize }` for the
 * title bar and its minimize button. Null outside the grid, so Panels rendered elsewhere
 * simply aren't draggable (and minimize just rolls them up).
 */
export const WindowContext = createContext(null)
export const useWindowHandle = () => useContext(WindowContext)
