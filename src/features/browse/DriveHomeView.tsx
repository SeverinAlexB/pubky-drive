import { useMemo } from 'react'
import { useDrive } from '../../app/DriveContext'
import { AREA_LABELS } from '../../app/locations'
import { ItemBrowser } from './ItemBrowser'
import type { ListItem } from './listItem'

/** Pubky Drive: the Public and Private areas as two folders. See docs/spec/02-navigation.md. */
export function DriveHomeView() {
  const { access } = useDrive()

  const items = useMemo<ListItem[]>(
    () =>
      (['public', 'private'] as const).flatMap((area) => {
        const root = access.roots[area]
        return root
          ? [{ kind: 'folder', path: root, name: AREA_LABELS[area], area, areaRoot: area }]
          : []
      }),
    [access],
  )

  const missing = (['public', 'private'] as const).filter((area) => !access.roots[area])

  return (
    <ItemBrowser
      title={<h1>Pubky Drive</h1>}
      items={items}
      columns="owner"
      banner={
        <div className="area-notes">
          <p>
            <strong>Public:</strong> anyone with the address can read these files.{' '}
            <strong>Private:</strong> only you and apps you authorize can read these files. Private
            files aren’t encrypted.
          </p>
          {missing.map((area) => (
            <p key={area} className="area-missing">
              {AREA_LABELS[area]}: no access. Sign out and sign in again to grant access.
            </p>
          ))}
        </div>
      }
      emptyState={
        <p>This session can’t access any storage. Sign out and sign in again to grant access.</p>
      }
    />
  )
}
