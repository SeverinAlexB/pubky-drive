// Dragging items onto folders, and dropping files from the computer. See docs/spec/06-organise.md.

import { useState, type DragEvent } from 'react'
import { itemFromPath } from '../../drive/items'
import type { StoragePath } from '../../drive/paths'
import { useItemActions } from '../actions/useItemActions'
import { filesFromDrop, useUploads } from '../upload/UploadsProvider'

/** Data type for items dragged within the app: a JSON array of plain paths. */
const ITEMS_TYPE = 'application/x-pubky-drive-items'

/** Starts dragging `paths`, with a small card showing the first name and a count. */
export function startItemDrag(event: DragEvent, paths: StoragePath[], label: string) {
  event.dataTransfer.setData(ITEMS_TYPE, JSON.stringify(paths))
  event.dataTransfer.effectAllowed = 'move'

  const card = document.createElement('div')
  card.className = 'drag-card'
  card.textContent = paths.length > 1 ? `${label}  +${paths.length - 1}` : label
  document.body.append(card)
  event.dataTransfer.setDragImage(card, 16, 16)
  requestAnimationFrame(() => card.remove())
}

/**
 * Props that make an element accept dragged items (they move into `target`) and dropped files
 * (they upload into `target`). `active` is true while something hovers over it.
 */
export function useDropTarget(target: StoragePath | undefined) {
  const [active, setActive] = useState(false)
  const actions = useItemActions()
  const uploads = useUploads()

  if (!target) return { active: false, dropProps: {} }

  const accepts = (event: DragEvent) =>
    event.dataTransfer.types.includes(ITEMS_TYPE) || event.dataTransfer.types.includes('Files')

  const dropProps = {
    onDragOver: (event: DragEvent) => {
      if (!accepts(event)) return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = event.dataTransfer.types.includes(ITEMS_TYPE)
        ? 'move'
        : 'copy'
      setActive(true)
    },
    onDragLeave: (event: DragEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      )
        setActive(false)
    },
    onDrop: (event: DragEvent) => {
      if (!accepts(event)) return
      event.preventDefault()
      event.stopPropagation()
      setActive(false)

      const dragged = event.dataTransfer.getData(ITEMS_TYPE)
      if (dragged) {
        const paths = (JSON.parse(dragged) as StoragePath[]).filter((path) => path !== target)
        void actions.moveTo(paths.map(itemFromPath), target)
        return
      }
      void filesFromDrop(event.dataTransfer).then((chosen) => uploads.uploadChosen(target, chosen))
    },
  }

  return { active, dropProps }
}
