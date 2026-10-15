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
import {
  accessFromCapabilities,
  HIDDEN_APP_FOLDERS,
  HOMESERVER_ROOTS,
  type DriveAccess,
} from '../drive/access'
import type { DriveItem } from '../drive/items'
import type { Area, StoragePath } from '../drive/paths'
import { DriveStorage, type FileStore } from '../drive/storage'
import { deleteExpiredEntries } from '../features/bin/bin'
import { listEverything } from '../features/search/search'
import { loadStarred, saveStarred } from '../features/starred/starred'
import { EventHub } from '../pubky/eventHub'
import { homeserverEventSource } from '../pubky/events'

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
  /** The session's one connection to the homeserver's event log. */
  events: EventHub
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

  const events = useMemo(
    () => new EventHub(homeserverEventSource(session, watchedFolders(access))),
    [session, access],
  )
  // Changes made elsewhere invalidate the search index; counting them avoids re-rendering on each event.
  const remoteChanges = useRef(0)
  useEffect(() => {
    const unsubscribe = events.subscribe(() => remoteChanges.current++)
    // Start on the next tick: React's development mode mounts effects twice, and this keeps that
    // from opening a second stream against the homeserver's rate limit.
    const timer = setTimeout(() => void events.start())
    return () => {
      clearTimeout(timer)
      unsubscribe()
      events.stop()
    }
  }, [events])

  const searchIndex = useRef<{ version: string; items: Promise<DriveItem[]> }>(undefined)
  const loadSearchIndex = useCallback(() => {
    const indexVersion = `${version}:${remoteChanges.current}`
    if (searchIndex.current?.version !== indexVersion) {
      const items = listEverything(drive, roots)
      items.catch(() => {
        searchIndex.current = undefined
      })
      searchIndex.current = { version: indexVersion, items }
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
      events,
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
      events,
    ],
  )

  return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>
}

export function useDrive() {
  const value = useContext(DriveContext)
  if (!value) throw new Error('useDrive must be used inside DriveProvider')
  return value
}

/**
 * The folders whose events the app follows: the whole storage of areas with homeserver access,
 * otherwise the Drive folder.
 */
function watchedFolders(access: DriveAccess): StoragePath[] {
  return (['public', 'private'] as Area[]).flatMap((area) => {
    if (access.homeserver[area]) return [HOMESERVER_ROOTS[area]]
    const root = access.roots[area]
    return root ? [root] : []
  })
}
