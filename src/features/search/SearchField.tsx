import { LoaderCircle, Search, X } from 'lucide-react'
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { useDrive } from '../../app/DriveContext'
import { folderLabel, folderRoute } from '../../app/locations'
import { navigate } from '../../app/routes'
import type { DriveItem } from '../../drive/items'
import { parentOf } from '../../drive/paths'
import { FileIcon } from '../../ui/FileIcon'
import { matchByName } from './search'
import './SearchField.css'

const SUGGESTION_DELAY_MS = 200
const MAX_SUGGESTIONS = 6

/** The header search field with suggestions. See docs/spec/10-search.md. */
export function SearchField({ initialQuery = '' }: { initialQuery?: string }) {
  const { loadSearchIndex } = useDrive()
  const [query, setQuery] = useState(initialQuery)
  const [highlighted, setHighlighted] = useState(-1)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const listId = useId()

  // Suggestions belong to the query they were found for.
  const [found, setFound] = useState<{ query: string; items: DriveItem[] }>({
    query: '',
    items: [],
  })
  const suggestions = open && found.query === query && query.trim() ? found.items : []

  useEffect(() => {
    if (!open || !query.trim()) return
    let active = true
    const timer = setTimeout(() => {
      setLoading(true)
      loadSearchIndex()
        .then(
          (items) =>
            active &&
            setFound({ query, items: matchByName(items, query).slice(0, MAX_SUGGESTIONS) }),
        )
        .catch(() => active && setFound({ query, items: [] }))
        .finally(() => active && setLoading(false))
    }, SUGGESTION_DELAY_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, open, loadSearchIndex])

  const choose = (item: DriveItem) => {
    setOpen(false)
    navigate(folderRoute(item.kind === 'folder' ? item.path : parentOf(item.path)))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      setHighlighted((highlighted + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      setHighlighted((highlighted - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      if (highlighted >= 0 && suggestions[highlighted]) choose(suggestions[highlighted])
      else if (query.trim()) {
        setOpen(false)
        navigate({ view: 'search', query: query.trim() })
      }
    } else if (event.key === 'Escape') {
      if (query) setQuery('')
      else event.currentTarget.blur()
      setOpen(false)
    } else {
      return
    }
    event.preventDefault()
  }

  return (
    <div className={`search ${open && suggestions.length > 0 ? 'open' : ''}`} role="search">
      <Search size={20} className="search-icon" aria-hidden />
      <input
        id="search-input"
        className="search-input"
        placeholder="Search Pubky Drive"
        aria-label="Search Pubky Drive"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={highlighted >= 0 ? `${listId}-${highlighted}` : undefined}
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setHighlighted(-1)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {loading && (
        <LoaderCircle size={18} className="spinner search-spinner" aria-label="Searching" />
      )}
      {query && (
        <button
          type="button"
          className="icon-button small"
          aria-label="Clear search"
          onClick={() => setQuery('')}
        >
          <X size={20} />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <ul className="search-suggestions" id={listId} role="listbox" aria-label="Suggestions">
          {suggestions.map((item, index) => (
            <li
              key={item.path}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(event) => {
                event.preventDefault()
                choose(item)
              }}
            >
              <FileIcon item={item} />
              <span className="search-suggestion-name">{item.name}</span>
              <span className="search-suggestion-location">{folderLabel(parentOf(item.path))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
