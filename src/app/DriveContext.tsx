import type { Session } from '@synonymdev/pubky'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { accessFromCapabilities, HIDDEN_APP_FOLDERS, type DriveAccess } from '../drive/access'
import type { DriveItem } from '../drive/items'
import type { Area, StoragePath } from '../drive/paths'
import { DriveStorage, type FileStore } from '../drive/storage'
import { deleteExpiredEntries } from '../features/bin/bin'
import { listEverything } from '../features/search/search'
import { loadStarred, saveStarred } from '../features/starred/starred'

/** The signed-in user's drive, shared by every view. */
interface DriveContextValue {
  session: Session
  /** The user's public key in transport form (z-base-32, without the `pubky` prefix). */
  ownerZ32: string
  access: DriveAccess
  drive: DriveStorage
  /** Root folders of the areas this session can use, public first. */
  roots: StoragePath[]
  /** Increases after every change made in this app, so views reload. */
  version: number
  markChanged(): void
  starred: ReadonlySet<StoragePath>
  /** Applies `change` to the starred paths and saves them. */
  updateStarred(change: (current: ReadonlySet<StoragePath>) => Set<StoragePath>): Promise<void>
  /** Every file and folder in both Drive areas, cached until the next change. */
  loadSearchIndex(): Promise<DriveItem[]>
  /** Switches to a session of the same identity with different access, such as homeserver access. */
  replaceSession(next: Session): Promise<void>
}

const DriveContext = createContext<DriveContextValue | undefined>(undefined)

interface DriveProviderProps {
  session: Session
  replaceSession: (next: Session) => Promise<void>
  children: ReactNode
}

export function DriveProvider({ session, replaceSession, children }: DriveProviderProps) {
  const ownerZ32 = session.info.publicKey.z32()
  const access = useMemo(() => accessFromCapabilities(session.info.capabilities), [session])
  const drive = useMemo(
    () => new DriveStorage(session.storage as unknown as FileStore, ownerZ32, HIDDEN_APP_FOLDERS),
    [session, ownerZ32],
  )
  const roots = useMemo(
    () =>
      (['public', 'private'] as Area[]).flatMap((area) =>
        access.roots[area] ? [access.roots[area]] : [],
      ),
    [access],
  )

  const [version, setVersion] = useState(0)
  const markChanged = useCallback(() => setVersion((current) => current + 1), [])

  const [starred, setStarred] = useState<ReadonlySet<StoragePath>>(new Set())
  const starredRef = useRef(starred)
  const updateStarred = useCallback(
    async (change: (current: ReadonlySet<StoragePath>) => Set<StoragePath>) => {
      const next = change(starredRef.current)
      starredRef.current = next
      setStarred(next)
      await saveStarred(drive.files, next)
    },
    [drive],
  )

  useEffect(() => {
    if (!access.appData) return
    let active = true
    loadStarred(drive.files).then(
      (loaded) => {
        if (!active) return
        starredRef.current = loaded
        setStarred(loaded)
      },
      (error: unknown) => console.warn('Could not load starred items', error),
    )
    deleteExpiredEntries(drive).catch((error: unknown) =>
      console.warn('Could not clean up the bin', error),
    )
    return () => {
      active = false
    }
  }, [drive, access.appData])

  const searchIndex = useRef<{ version: number; items: Promise<DriveItem[]> }>(undefined)
  const loadSearchIndex = useCallback(() => {
    if (searchIndex.current?.version !== version) {
      const items = listEverything(drive, roots)
      items.catch(() => {
        searchIndex.current = undefined
      })
      searchIndex.current = { version, items }
    }
    return searchIndex.current.items
  }, [drive, roots, version])

  const value = useMemo(
    () => ({
      session,
      ownerZ32,
      access,
      drive,
      roots,
      version,
      markChanged,
      starred,
      updateStarred,
      loadSearchIndex,
      replaceSession,
    }),
    [
      session,
      ownerZ32,
      access,
      drive,
      roots,
      version,
      markChanged,
      starred,
      updateStarred,
      loadSearchIndex,
      replaceSession,
    ],
  )

  return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>
}

export function useDrive() {
  const value = useContext(DriveContext)
  if (!value) throw new Error('useDrive must be used inside DriveProvider')
  return value
}
