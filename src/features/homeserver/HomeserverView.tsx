import { useMemo } from 'react'
import { useDrive } from '../../app/DriveContext'
import { HOMESERVER_AREA_LABELS } from '../../app/locations'
import { HOMESERVER_ROOTS } from '../../drive/access'
import { ItemBrowser } from '../browse/ItemBrowser'
import type { ListItem } from '../browse/listItem'
import { HomeserverAccessNote, HomeserverLocked } from './HomeserverNotices'

/** The Homeserver section: `/pub` and `/priv`, or the request for access. See docs/spec/02-navigation.md. */
export function HomeserverView() {
  const { access } = useDrive()

  const items = useMemo<ListItem[]>(
    () =>
      (['public', 'private'] as const).flatMap((area) =>
        access.homeserver[area]
          ? [
              {
                kind: 'folder',
                path: HOMESERVER_ROOTS[area],
                name: HOMESERVER_AREA_LABELS[area],
                area,
                areaRoot: area,
              },
            ]
          : [],
      ),
    [access],
  )

  if (items.length === 0) return <HomeserverLocked />

  return (
    <ItemBrowser
      title={<h1>Homeserver</h1>}
      items={items}
      columns="owner"
      banner={<HomeserverAccessNote />}
      emptyState={<HomeserverLocked />}
    />
  )
}
