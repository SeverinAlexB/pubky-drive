import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import './Menu.css'

export type MenuEntry =
  | { type: 'separator' }
  | { type: 'caption'; label: string }
  | {
      type: 'item'
      label: string
      icon?: LucideIcon
      shortcut?: string
      disabled?: boolean
      onSelect: () => void
    }
  | { type: 'submenu'; label: string; icon?: LucideIcon; disabled?: boolean; entries: MenuEntry[] }

export const separator: MenuEntry = { type: 'separator' }

/** Where a menu opens: at a pointer position, or below an element. */
export type MenuAnchor = { x: number; y: number } | { element: Element }

interface MenuProps {
  entries: MenuEntry[]
  anchor: MenuAnchor
  onClose: () => void
  label?: string
}

/** A popup menu, rendered above everything. It closes after a choice, on Esc and on outside clicks. */
export function Menu({ entries, anchor, onClose, label }: MenuProps) {
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.menu')) onClose()
    }
    const closeOnBlur = () => onClose()
    document.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('blur', closeOnBlur)
    window.addEventListener('resize', closeOnBlur)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('blur', closeOnBlur)
      window.removeEventListener('resize', closeOnBlur)
    }
  }, [onClose])

  return createPortal(
    <MenuPanel
      entries={entries}
      anchor={anchor}
      onClose={onClose}
      onChosen={onClose}
      label={label}
      autoFocus
    />,
    document.body,
  )
}

interface MenuPanelProps {
  entries: MenuEntry[]
  anchor: MenuAnchor | { besideElement: Element }
  /** Closes this panel only (Esc or ← in a submenu). */
  onClose: () => void
  /** Closes the whole menu after a choice. */
  onChosen: () => void
  label?: string
  autoFocus?: boolean
}

function MenuPanel({ entries, anchor, onClose, onChosen, label, autoFocus }: MenuPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: -9999, top: -9999 })
  const [openSubmenu, setOpenSubmenu] = useState<{
    index: number
    element: Element
    focus: boolean
  }>()

  useLayoutEffect(() => {
    const panel = ref.current
    if (!panel) return
    setPosition(placePanel(panel.getBoundingClientRect(), anchor))
    if (autoFocus) firstEnabledItem(panel)?.focus()
  }, [anchor, autoFocus])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>(':scope > .menu-item:not(:disabled)') ??
        []),
    ]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)

    switch (event.key) {
      case 'ArrowDown':
        items[(index + 1) % items.length]?.focus()
        break
      case 'ArrowUp':
        items[(index - 1 + items.length) % items.length]?.focus()
        break
      case 'Home':
        items[0]?.focus()
        break
      case 'End':
        items[items.length - 1]?.focus()
        break
      case 'ArrowLeft':
      case 'Escape':
        onClose()
        break
      case 'Tab':
        onChosen()
        break
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      ref={ref}
      className="menu"
      role="menu"
      aria-label={label}
      style={position}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {entries.map((entry, index) => {
        switch (entry.type) {
          case 'separator':
            return <div key={index} className="menu-separator" role="separator" />
          case 'caption':
            return (
              <div key={index} className="menu-caption">
                {entry.label}
              </div>
            )
          case 'item':
            return (
              <button
                key={index}
                type="button"
                role="menuitem"
                className="menu-item"
                disabled={entry.disabled}
                onMouseEnter={() => setOpenSubmenu(undefined)}
                onClick={() => {
                  onChosen()
                  entry.onSelect()
                }}
              >
                <MenuIcon icon={entry.icon} />
                <span className="menu-label">{entry.label}</span>
                {entry.shortcut && (
                  <span className="menu-shortcut" aria-hidden>
                    {entry.shortcut}
                  </span>
                )}
              </button>
            )
          case 'submenu':
            return (
              <button
                key={index}
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={openSubmenu?.index === index}
                className="menu-item"
                disabled={entry.disabled}
                onMouseEnter={(event) =>
                  setOpenSubmenu({ index, element: event.currentTarget, focus: false })
                }
                onClick={(event) =>
                  setOpenSubmenu({ index, element: event.currentTarget, focus: true })
                }
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowRight') return
                  event.preventDefault()
                  event.stopPropagation()
                  setOpenSubmenu({ index, element: event.currentTarget, focus: true })
                }}
              >
                <MenuIcon icon={entry.icon} />
                <span className="menu-label">{entry.label}</span>
                <ChevronRight size={18} className="menu-chevron" />
              </button>
            )
        }
      })}
      {openSubmenu && entries[openSubmenu.index]?.type === 'submenu' && (
        <MenuPanel
          key={openSubmenu.index}
          entries={(entries[openSubmenu.index] as { entries: MenuEntry[] }).entries}
          anchor={{ besideElement: openSubmenu.element }}
          onClose={() => {
            ;(openSubmenu.element as HTMLElement).focus()
            setOpenSubmenu(undefined)
          }}
          onChosen={onChosen}
          autoFocus={openSubmenu.focus}
        />
      )}
    </div>
  )
}

function MenuIcon({ icon: Icon }: { icon?: LucideIcon }) {
  return <span className="menu-icon">{Icon && <Icon size={20} strokeWidth={1.75} />}</span>
}

function firstEnabledItem(panel: HTMLElement) {
  return panel.querySelector<HTMLButtonElement>(':scope > .menu-item:not(:disabled)')
}

const MARGIN = 8

/** Fixed position for a panel of `size`, kept inside the viewport. */
function placePanel(size: DOMRect, anchor: MenuAnchor | { besideElement: Element }) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  let left: number
  let top: number

  if ('besideElement' in anchor) {
    const item = anchor.besideElement.getBoundingClientRect()
    left = item.right + size.width > viewportWidth - MARGIN ? item.left - size.width : item.right
    top = item.top - 8
  } else if ('element' in anchor) {
    const element = anchor.element.getBoundingClientRect()
    left = element.left
    top = element.bottom + 4
    if (top + size.height > viewportHeight - MARGIN) top = element.top - size.height - 4
  } else {
    left = anchor.x
    top = anchor.y
    if (left + size.width > viewportWidth - MARGIN) left = anchor.x - size.width
    if (top + size.height > viewportHeight - MARGIN) top = anchor.y - size.height
  }

  return {
    left: Math.max(MARGIN, Math.min(left, viewportWidth - size.width - MARGIN)),
    top: Math.max(MARGIN, Math.min(top, viewportHeight - size.height - MARGIN)),
  }
}
