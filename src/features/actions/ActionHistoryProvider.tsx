import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { DriveItem } from '../../drive/items'
import type { StoragePath } from '../../drive/paths'
import { ActionHistory } from './history'

/** Items copied (⌘C) or cut (⌘X), waiting to be pasted (⌘V). */
export interface ItemClipboard {
  current?: { mode: 'copy' | 'cut'; items: DriveItem[] }
}

interface ActionHistoryValue {
  history: ActionHistory
  clipboard: ItemClipboard
  /** App folders whose files the user agreed to change, until sign-out. */
  confirmedApps: Set<StoragePath>
}

const ActionHistoryContext = createContext<ActionHistoryValue | undefined>(undefined)

/**
 * Keeps the undo history, the item clipboard and the confirmed app folders for the session,
 * shared by every view.
 */
export function ActionHistoryProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({ history: new ActionHistory(), clipboard: {}, confirmedApps: new Set<StoragePath>() }),
    [],
  )
  return <ActionHistoryContext.Provider value={value}>{children}</ActionHistoryContext.Provider>
}

export function useActionHistory() {
  const value = useContext(ActionHistoryContext)
  if (!value) throw new Error('useActionHistory needs an ActionHistoryProvider')
  return value
}
