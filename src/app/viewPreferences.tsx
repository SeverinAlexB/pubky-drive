import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Layout = 'list' | 'grid'

/** How the file list looks, saved in the browser. */
interface ViewPreferences {
  layout: Layout
  setLayout(layout: Layout): void
  detailsOpen: boolean
  setDetailsOpen(open: boolean): void
}

const STORAGE_KEY = 'pubky-drive:view'
const ViewPreferencesContext = createContext<ViewPreferences | undefined>(undefined)

export function ViewPreferencesProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState(readSaved)

  const update = useCallback((change: Partial<typeof saved>) => {
    setSaved((current) => {
      const next = { ...current, ...change }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo<ViewPreferences>(
    () => ({
      layout: saved.layout,
      setLayout: (layout) => update({ layout }),
      detailsOpen: saved.detailsOpen,
      setDetailsOpen: (detailsOpen) => update({ detailsOpen }),
    }),
    [saved, update],
  )

  return <ViewPreferencesContext.Provider value={value}>{children}</ViewPreferencesContext.Provider>
}

export function useViewPreferences() {
  const value = useContext(ViewPreferencesContext)
  if (!value) throw new Error('useViewPreferences must be used inside ViewPreferencesProvider')
  return value
}

function readSaved(): { layout: Layout; detailsOpen: boolean } {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return {
      layout: value.layout === 'grid' ? 'grid' : 'list',
      detailsOpen: value.detailsOpen === true,
    }
  } catch {
    return { layout: 'list', detailsOpen: false }
  }
}
