import { Check, ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { Menu } from '../../ui/Menu'

interface FilterChipProps<T extends string> {
  /** The chip's name while nothing is chosen, such as "Type". */
  label: string
  options: { value: T; label: string }[]
  value: T | undefined
  onChange: (value: T | undefined) => void
}

/** A filter chip with a menu of options. A chosen option shows on the chip, with a clear button. */
export function FilterChip<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterChipProps<T>) {
  const [anchor, setAnchor] = useState<Element>()
  const chosen = options.find((option) => option.value === value)

  return (
    <span className="filter-chip-group">
      <button
        type="button"
        className={`filter-chip ${chosen ? 'active' : ''}`}
        aria-haspopup="menu"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        {chosen ? chosen.label : label}
        {!chosen && <ChevronDown size={16} aria-hidden />}
      </button>
      {chosen && (
        <button
          type="button"
          className="icon-button small"
          aria-label={`Clear ${label.toLowerCase()} filter`}
          onClick={() => onChange(undefined)}
        >
          <X size={18} />
        </button>
      )}
      {anchor && (
        <Menu
          label={label}
          anchor={{ element: anchor }}
          onClose={() => setAnchor(undefined)}
          entries={options.map((option) => ({
            type: 'item' as const,
            label: option.label,
            icon: option.value === value ? Check : undefined,
            onSelect: () => onChange(option.value),
          }))}
        />
      )}
    </span>
  )
}
