import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useDrive } from '../../app/DriveContext'
import { LARGE_FILE_BYTES } from '../../config'
import { useConfirmHomeserverChange } from '../homeserver/useConfirmHomeserverChange'
import { describeError } from '../../drive/errors'
import type { StoragePath } from '../../drive/paths'
import { useConfirm } from '../../ui/Dialog'
import { useNotifier } from '../../ui/Snackbar'
import { formatSize } from '../browse/format'
import { UploadPanel } from './UploadPanel'
import { planUploads, type ChosenFile, type PlannedUpload } from './uploadPlan'

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'canceled'

export interface UploadRow {
  id: number
  name: string
  status: UploadStatus
  error?: string
  upload: PlannedUpload
}

interface Uploads {
  /** Opens the file picker and uploads the chosen files into `folder`. */
  pickFiles(folder: StoragePath): void
  /** Opens the folder picker and uploads the chosen folder into `folder`. */
  pickFolder(folder: StoragePath): void
  /** Uploads files that were chosen another way, such as by dropping them. */
  uploadChosen(folder: StoragePath, chosen: ChosenFile[]): Promise<void>
}

const PARALLEL_UPLOADS = 2
const UploadsContext = createContext<Uploads | undefined>(undefined)

export function UploadsProvider({ children }: { children: ReactNode }) {
  const { drive, markChanged } = useDrive()
  const { notify } = useNotifier()
  const confirm = useConfirm()
  const homeserverChanges = useConfirmHomeserverChange()
  const [rows, setRows] = useState<UploadRow[]>([])
  const rowsRef = useRef<UploadRow[]>([])
  const running = useRef(0)
  const nextId = useRef(1)

  const updateRows = useCallback((change: (rows: UploadRow[]) => UploadRow[]) => {
    rowsRef.current = change(rowsRef.current)
    setRows(rowsRef.current)
  }, [])

  const setStatus = useCallback(
    (id: number, status: UploadStatus, error?: string) =>
      updateRows((current) =>
        current.map((row) => (row.id === id ? { ...row, status, error } : row)),
      ),
    [updateRows],
  )

  const pump = useCallback(() => {
    while (running.current < PARALLEL_UPLOADS) {
      const next = rowsRef.current.find((row) => row.status === 'queued')
      if (!next) break

      running.current++
      setStatus(next.id, 'uploading')
      void (async () => {
        try {
          const bytes = new Uint8Array(await next.upload.file.arrayBuffer())
          await drive.files.putBytes(next.upload.target, bytes)
          setStatus(next.id, 'done')
        } catch (error) {
          setStatus(next.id, 'failed', describeError(error))
        } finally {
          running.current--
          if (!rowsRef.current.some((row) => row.status === 'queued' || row.status === 'uploading'))
            markChanged()
          pump()
        }
      })()
    }
  }, [drive, markChanged, setStatus])

  // Batches are planned one at a time, so each sees the names the previous one reserved.
  const planningQueue = useRef<Promise<void>>(Promise.resolve())

  const planAndQueue = useCallback(
    async (folder: StoragePath, chosen: ChosenFile[]) => {
      if (!(await homeserverChanges.confirmChange({ into: [folder] }))) return
      let planned: PlannedUpload[]
      try {
        const pending = rowsRef.current
          .filter((row) => row.status === 'queued' || row.status === 'uploading')
          .map((row) => row.upload.target)
        planned = await planUploads(drive, folder, chosen, pending)
      } catch (error) {
        notify(describeError(error))
        return
      }

      const large = planned.filter((upload) => upload.file.size > LARGE_FILE_BYTES)
      if (large.length > 0) {
        const confirmed = await confirm({
          title: 'Upload large files?',
          message: `${large.map((upload) => `${upload.file.name} (${formatSize(upload.file.size)})`).join(', ')} ${
            large.length === 1 ? 'is' : 'are'
          } over ${formatSize(LARGE_FILE_BYTES)}. The browser keeps each file in memory while it uploads.`,
          confirmLabel: 'Upload',
        })
        if (!confirmed) return
      }

      const finished = rowsRef.current.every(
        (row) => row.status !== 'queued' && row.status !== 'uploading',
      )
      const added = planned.map((upload) => ({
        id: nextId.current++,
        name: upload.file.name,
        status: 'queued' as const,
        upload,
      }))
      updateRows((current) => [...(finished ? [] : current), ...added])
      pump()
    },
    [drive, notify, confirm, homeserverChanges, updateRows, pump],
  )

  const uploadChosen = useCallback(
    (folder: StoragePath, chosen: ChosenFile[]) => {
      if (chosen.length === 0) return Promise.resolve()
      const turn = planningQueue.current.then(() => planAndQueue(folder, chosen))
      planningQueue.current = turn.catch(() => {})
      return turn
    },
    [planAndQueue],
  )

  const pick = useCallback(
    (folder: StoragePath, directory: boolean) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.webkitdirectory = directory
      input.addEventListener('change', () => {
        const files = [...(input.files ?? [])]
        void uploadChosen(
          folder,
          files.map((file) => ({ file, relativePath: file.webkitRelativePath || file.name })),
        )
      })
      input.click()
    },
    [uploadChosen],
  )

  const cancelQueued = useCallback(
    () =>
      updateRows((current) =>
        current.map((row) => (row.status === 'queued' ? { ...row, status: 'canceled' } : row)),
      ),
    [updateRows],
  )

  const retry = useCallback(
    (id: number) => {
      setStatus(id, 'queued')
      pump()
    },
    [setStatus, pump],
  )

  const close = useCallback(async () => {
    const active = rowsRef.current.some(
      (row) => row.status === 'queued' || row.status === 'uploading',
    )
    if (active) {
      const confirmed = await confirm({
        title: 'Cancel uploads?',
        message: 'Uploads that haven’t started yet will be canceled.',
        confirmLabel: 'Cancel uploads',
      })
      if (!confirmed) return
      cancelQueued()
    }
    updateRows((current) => current.filter((row) => row.status === 'uploading'))
  }, [confirm, cancelQueued, updateRows])

  const value = useMemo(
    () => ({
      pickFiles: (folder: StoragePath) => pick(folder, false),
      pickFolder: (folder: StoragePath) => pick(folder, true),
      uploadChosen,
    }),
    [pick, uploadChosen],
  )

  return (
    <UploadsContext.Provider value={value}>
      {children}
      {rows.length > 0 && (
        <UploadPanel rows={rows} onCancel={cancelQueued} onRetry={retry} onClose={close} />
      )}
    </UploadsContext.Provider>
  )
}

export function useUploads() {
  const value = useContext(UploadsContext)
  if (!value) throw new Error('useUploads must be used inside UploadsProvider')
  return value
}

/** The files in a drop, with folder structure, read through the File System entries API. */
export async function filesFromDrop(dataTransfer: DataTransfer): Promise<ChosenFile[]> {
  const entries = [...dataTransfer.items]
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry))
  if (entries.length === 0) {
    return [...dataTransfer.files].map((file) => ({ file, relativePath: file.name }))
  }

  const chosen: ChosenFile[] = []
  for (const entry of entries) await collectEntry(entry, '', chosen)
  return chosen
}

async function collectEntry(entry: FileSystemEntry, prefix: string, chosen: ChosenFile[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    )
    chosen.push({ file, relativePath: `${prefix}${entry.name}` })
    return
  }

  const reader = (entry as FileSystemDirectoryEntry).createReader()
  for (;;) {
    // readEntries returns at most 100 entries per call; an empty batch means the end.
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    )
    if (batch.length === 0) break
    for (const child of batch) await collectEntry(child, `${prefix}${entry.name}/`, chosen)
  }
}
