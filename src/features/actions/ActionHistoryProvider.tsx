import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { DriveItem } from '../../drive/items'
import { ActionHistory } from './history'

/** Items copied (⌘C) or cut (⌘X), waiting to be pasted (⌘V). */
export interface ItemClipboard {
  current?: { mode: 'copy' | 'cut'; items: DriveItem[] }
}

interface ActionHistoryValue {
  history: ActionHistory
  clipboard: ItemClipboard
}

const ActionHistoryContext = createContext<ActionHistoryValue | undefined>(undefined)

/** Keeps the undo history and the item clipboard for the session, shared by every view. */
export function ActionHistoryProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ history: new ActionHistory(), clipboard: {} }), [])
  return <ActionHistoryContext.Provider value={value}>{children}</ActionHistoryContext.Provider>
}

export function useActionHistory() {
  const value = useContext(ActionHistoryContext)
  if (!value) throw new Error('useActionHistory needs an ActionHistoryProvider')
  return value
}
