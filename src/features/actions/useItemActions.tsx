// Every command on items, shared by menus, the selection bar, drag and drop and shortcuts.
// Each command reports its outcome in the snackbar and, where possible, offers Undo.

import { useMemo } from 'react'
import { useDrive } from '../../app/DriveContext'
import {
  AREA_LABELS,
  folderLabel,
  folderRoute,
  locate,
  matchingFolderInOtherArea,
} from '../../app/locations'
import { canWrite } from '../../drive/access'
import { navigate } from '../../app/routes'
import { describeError } from '../../drive/errors'
import { itemFromPath, type DriveItem } from '../../drive/items'
import { copyName } from '../../drive/names'
import {
  copyItem,
  createFolder,
  deleteItem,
  moveItem,
  renameItem,
  type Progress,
} from '../../drive/operations'
import { nameOf, parentOf, type Area, type StoragePath } from '../../drive/paths'
import { useConfirm, useDialogHost } from '../../ui/Dialog'
import { useNotifier } from '../../ui/Snackbar'
import * as bin from '../bin/bin'
import { downloadItems } from '../download/download'
import { MoveDialog } from '../organise/MoveDialog'
import { NameDialog } from '../organise/NameDialog'
import { copyText } from '../sharing/clipboard'
import { viewerLink } from '../sharing/links'
import { ShareDialog } from '../sharing/ShareDialog'
import { followMove, forgetRemoved } from '../starred/starred'

export type ItemActions = ReturnType<typeof useItemActions>

export function useItemActions() {
  const { drive, access, roots, ownerZ32, markChanged, starred, updateStarred, onHomeserverBusy } =
    useDrive()
  const { notify, dismiss } = useNotifier()
  const { openDialog } = useDialogHost()
  const confirm = useConfirm()

  return useMemo(() => {
    /**
     * Runs `task` with its progress in a persistent snackbar, then refreshes the views. The
     * caller's outcome message replaces the progress message; a failure removes it.
     */
    async function run<T>(progressLabel: string, task: (onProgress: Progress) => Promise<T>) {
      let step = `${progressLabel}…`
      let progressId = notify(step, { persistent: true })
      const onProgress: Progress = (done, total) => {
        if (total < 2) return
        step = `${progressLabel} ${Math.min(done + 1, total)} of ${total}…`
        progressId = notify(step, { persistent: true })
      }
      // Rate-limited requests wait and retry; say so, so a pause doesn't look like a hang.
      const stopListening = onHomeserverBusy((waitMs) => {
        progressId = notify(
          `${step} The homeserver is busy; retrying in ${Math.ceil(waitMs / 1000)} s.`,
          {
            persistent: true,
          },
        )
      })
      try {
        return await task(onProgress)
      } catch (error) {
        dismiss(progressId)
        throw error
      } finally {
        stopListening()
        markChanged()
      }
    }

    async function attempt(task: () => Promise<void>) {
      try {
        await task()
      } catch (error) {
        notify(describeError(error))
        markChanged()
      }
    }

    function plural(items: readonly { name: string }[], noun = 'item') {
      return items.length === 1 ? `‘${items[0].name}’` : `${items.length} ${noun}s`
    }

    /**
     * Asks before items move between My Drive and the rest of the homeserver, because that changes
     * which apps find them. Resolves to true when no confirmation is needed.
     */
    async function confirmSectionChange(items: readonly DriveItem[], target: StoragePath) {
      const targetScope = locate(target).scope
      if (items.every((item) => locate(item.path).scope === targetScope)) return true
      return confirm(
        targetScope === 'drive'
          ? {
              title: 'Move into your Drive?',
              message: `${plural(items)} will move into Pubky Drive. Apps that use ${items.length === 1 ? 'it' : 'them'} at the current place won’t find ${items.length === 1 ? 'it' : 'them'} any more.`,
              confirmLabel: 'Move',
            }
          : {
              title: 'Move out of your Drive?',
              message: `${plural(items)} will move to ${folderLabel(target)}, outside Pubky Drive’s folder.`,
              confirmLabel: 'Move',
            },
      )
    }

    async function moveEach(
      items: readonly DriveItem[],
      target: StoragePath,
      onProgress: Progress,
    ) {
      const moved: { from: DriveItem; to: StoragePath }[] = []
      for (const item of items) {
        const to = await moveItem(drive, item, target, item.name, 'number', onProgress)
        moved.push({ from: item, to })
        await updateStarred((current) => followMove(current, item.path, to)).catch(() => {})
      }
      return moved
    }

    const actions = {
      newFolder(parent: StoragePath) {
        openDialog((close) => (
          <NameDialog
            title="New folder"
            initialName="Untitled folder"
            confirmLabel="Create"
            onClose={close}
            onConfirm={async (name) => {
              await createFolder(drive, parent, name)
              markChanged()
              notify(`‘${name}’ created`)
            }}
          />
        ))
      },

      rename(item: DriveItem) {
        openDialog((close) => (
          <NameDialog
            title="Rename"
            initialName={item.name}
            confirmLabel="OK"
            closeWhenUnchanged
            onClose={close}
            onConfirm={async (newName) => {
              const renamed = await run(
                item.kind === 'folder' ? 'Renaming' : 'Saving',
                (onProgress) => renameItem(drive, item, newName, onProgress),
              )
              await updateStarred((current) => followMove(current, item.path, renamed)).catch(
                () => {},
              )
              notify(`‘${item.name}’ renamed to ‘${newName}’`, {
                action: {
                  label: 'Undo',
                  run: () =>
                    void attempt(async () => {
                      await run('Undoing', (onProgress) =>
                        renameItem(drive, itemFromPath(renamed), item.name, onProgress),
                      )
                      await updateStarred((current) => followMove(current, renamed, item.path))
                      notify('Rename undone')
                    }),
                },
              })
            }}
          />
        ))
      },

      makeCopy(item: DriveItem) {
        return attempt(async () => {
          const copy = await run('Copying', (onProgress) =>
            copyItem(drive, item, parentOf(item.path), copyName(item.name), onProgress),
          )
          notify(`Created ‘${nameOf(copy)}’`, {
            action: {
              label: 'Undo',
              run: () =>
                void attempt(async () => {
                  await run('Undoing', (onProgress) =>
                    deleteItem(drive, itemFromPath(copy), onProgress),
                  )
                  notify('Copy removed')
                }),
            },
          })
        })
      },

      move(items: DriveItem[]) {
        openDialog((close) => (
          <MoveDialog
            items={items}
            onClose={close}
            onMove={(target) => actions.moveTo(items, target, { throwErrors: true })}
          />
        ))
      },

      /** Moves the items into `target`, numbering names that are taken there. */
      async moveTo(
        items: DriveItem[],
        target: StoragePath,
        options: { throwErrors?: boolean } = {},
      ) {
        const movable = items.filter((item) => parentOf(item.path) !== target)
        if (movable.length === 0) return
        if (!(await confirmSectionChange(movable, target))) return
        try {
          const moved = await run('Moving', (onProgress) => moveEach(movable, target, onProgress))
          notify(`${plural(movable)} moved to ‘${folderLabel(target)}’`, {
            action: {
              label: 'Undo',
              run: () =>
                void attempt(async () => {
                  await run('Undoing', async (onProgress) => {
                    for (const { from, to } of moved) {
                      const back = await moveItem(
                        drive,
                        itemFromPath(to),
                        parentOf(from.path),
                        from.name,
                        'number',
                        onProgress,
                      )
                      await updateStarred((current) => followMove(current, to, back)).catch(
                        () => {},
                      )
                    }
                  })
                  notify('Move undone')
                }),
            },
          })
        } catch (error) {
          if (options.throwErrors) throw error
          notify(describeError(error))
        }
      },

      async toggleStar(items: DriveItem[]) {
        if (!access.appData) return
        const allStarred = items.every((item) => starred.has(item.path))
        const before = new Set(starred)
        await attempt(async () => {
          await updateStarred((current) => {
            const next = new Set(current)
            for (const item of items) {
              if (allStarred) next.delete(item.path)
              else next.add(item.path)
            }
            return next
          })
          const count = items.length === 1 ? '1 item' : `${items.length} items`
          notify(allStarred ? `${count} removed from starred` : `${count} added to starred`, {
            action: { label: 'Undo', run: () => void attempt(() => updateStarred(() => before)) },
          })
        })
      },

      async moveToBin(items: DriveItem[]) {
        if (!access.appData) {
          await actions.deleteForever(items)
          return
        }
        await attempt(async () => {
          const entries = await run('Moving to bin', async (onProgress) => {
            const binned: bin.BinEntry[] = []
            for (const item of items) {
              binned.push(await bin.moveToBin(drive, item, onProgress))
              await updateStarred((current) => forgetRemoved(current, item.path)).catch(() => {})
            }
            return binned
          })
          notify(`${plural(items)} moved to bin`, {
            action: {
              label: 'Undo',
              run: () =>
                void attempt(async () => {
                  await run('Restoring', async (onProgress) => {
                    for (const entry of entries)
                      await bin.restoreFromBin(drive, entry, roots, onProgress)
                  })
                  notify('Restored')
                }),
            },
          })
        })
      },

      async deleteForever(items: DriveItem[]) {
        const confirmed = await confirm({
          title: 'Delete forever?',
          message: `${plural(items)} will be deleted forever. This can’t be undone.`,
          confirmLabel: 'Delete forever',
          danger: true,
        })
        if (!confirmed) return
        await attempt(async () => {
          await run('Deleting', async (onProgress) => {
            for (const item of items) await deleteItem(drive, item, onProgress)
          })
          notify(`${plural(items)} deleted forever`)
        })
      },

      download(items: DriveItem[]) {
        return attempt(async () => {
          const progressId = notify('Preparing download…', { persistent: true })
          try {
            await downloadItems(drive, items)
          } finally {
            dismiss(progressId)
          }
        })
      },

      share(item: DriveItem) {
        openDialog((close) => (
          <ShareDialog
            item={item}
            onClose={close}
            onCopied={(what) => notify(`${what} copied`)}
            onChangeArea={actions.changeArea}
          />
        ))
      },

      /** Moves an item to the same place in the other area, after confirmation. */
      async changeArea(item: DriveItem, area: Area) {
        if (area === item.area) return false
        const target = matchingFolderInOtherArea(item.path)
        if (!canWrite(access, item.path) || !canWrite(access, target)) return false
        const confirmed = await confirm(
          area === 'public'
            ? {
                title: `Make ‘${item.name}’ public?`,
                message: 'Anyone with the link can open it, and copies can’t be recalled later.',
                confirmLabel: 'Make public',
              }
            : {
                title: `Make ‘${item.name}’ private?`,
                message: 'People who already downloaded it keep their copies.',
                confirmLabel: 'Make private',
              },
        )
        if (!confirmed) return false

        const moved = await run('Moving', (onProgress) =>
          moveItem(drive, item, target, item.name, 'number', onProgress),
        )
        await updateStarred((current) => followMove(current, item.path, moved)).catch(() => {})
        notify(`‘${item.name}’ is now ${AREA_LABELS[area].toLowerCase()}`, {
          action: { label: 'Show', run: () => navigate(folderRoute(parentOf(moved))) },
        })
        return true
      },

      copyLink(items: DriveItem[]) {
        return attempt(async () => {
          const publicItems = items.filter((item) => item.area === 'public')
          if (publicItems.length === 0) {
            notify('Private items have no link. Make them public in Share.')
            return
          }
          await copyText(publicItems.map((item) => viewerLink(ownerZ32, item.path)).join('\n'))
          notify(publicItems.length === 1 ? 'Link copied' : `${publicItems.length} links copied`)
        })
      },

      showLocation(item: DriveItem) {
        navigate(folderRoute(parentOf(item.path)))
      },

      async restore(entries: bin.BinEntry[]) {
        await attempt(async () => {
          const restored = await run('Restoring', async (onProgress) => {
            const paths: StoragePath[] = []
            for (const entry of entries)
              paths.push(await bin.restoreFromBin(drive, entry, roots, onProgress))
            return paths
          })
          notify(`${plural(entries)} restored`, {
            action: {
              label: 'Show location',
              run: () => navigate(folderRoute(parentOf(restored[0]))),
            },
          })
        })
      },

      async deleteBinEntries(entries: bin.BinEntry[]) {
        const confirmed = await confirm({
          title: 'Delete forever?',
          message: `${plural(entries)} will be deleted forever. This can’t be undone.`,
          confirmLabel: 'Delete forever',
          danger: true,
        })
        if (!confirmed) return
        await attempt(async () => {
          await run('Deleting', async () => {
            for (const entry of entries) await bin.deleteForever(drive, entry)
          })
          notify(
            entries.length === 1
              ? 'File deleted forever'
              : `${entries.length} items deleted forever`,
          )
        })
      },

      async emptyBin(entries: bin.BinEntry[]) {
        const confirmed = await confirm({
          title: 'Empty bin?',
          message: 'All items in the bin will be deleted forever. This can’t be undone.',
          confirmLabel: 'Empty bin',
          danger: true,
        })
        if (!confirmed) return
        await attempt(async () => {
          await run('Emptying bin', () => bin.emptyBin(drive, entries))
          notify('Bin emptied')
        })
      },
    }
    return actions
  }, [
    drive,
    access,
    roots,
    onHomeserverBusy,
    ownerZ32,
    markChanged,
    starred,
    updateStarred,
    notify,
    dismiss,
    openDialog,
    confirm,
  ])
}
