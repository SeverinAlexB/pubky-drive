# 02 Navigation (P1)

## Routes

The app uses hash routes, so it works from any static host:

| Route                                                       | View                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `#/drive`                                                   | My Drive: the Public and Private areas as two folders              |
| `#/drive/public/<path>`                                     | A folder in the public area                                        |
| `#/drive/private/<path>`                                    | A folder in the private area                                       |
| `#/homeserver`                                              | Homeserver: `/pub` and `/priv`, or the request for access          |
| `#/homeserver/public/<path>`, `#/homeserver/private/<path>` | A folder in the raw storage                                        |
| `#/recent`                                                  | Recently changed files                                             |
| `#/starred`                                                 | Starred items                                                      |
| `#/bin`                                                     | Bin                                                                |
| `#/search?q=<query>`                                        | Search results                                                     |
| `#/view/<pubky address>`                                    | Public viewer for a shared file; works without signing in (see 09) |

Path segments are URL-encoded. An unknown route opens My Drive.

## Title row

- **My Drive** shows the title "My Drive".
- **Inside a folder** the title is a breadcrumb: `My Drive › Public › photos ›
2026 ▾`. Earlier segments are links. The last segment opens the
  current-folder menu (see 04). When the breadcrumb is too wide, middle
  segments collapse into "…", which opens a menu of the hidden folders.
- **Inside the Homeserver section** the breadcrumb uses raw names:
  `Homeserver › /pub › pubky.app ▾`.
- **Other views** show their name: Recent, Starred, Bin, Search results.
- At the right of the title row: the list/grid toggle and the View details
  button (see 03 and 08).

## My Drive

My Drive lists the two areas as folders:

- **Public**: globe icon, description "Anyone with the address can read
  these files".
- **Private**: lock icon, description "Only you and apps you authorize can
  read these files. Not encrypted".

An area without access appears greyed out with "No access. Sign in again to
grant access", and can't be opened.

## Going up

⌥↑ opens the parent folder. Backspace doesn't navigate; it moves the
selection to the bin (see 04).

## Live updates

While a folder is open, changes made elsewhere appear without reloading. The
selection keeps the items that still exist.

## Homeserver section

The Homeserver section shows the whole storage, `/pub` and `/priv`, including
other apps' data. See docs/design.md, "Two sections" and "Access levels".

- **Without access:** a centred page with a server icon, "Browse your whole
  homeserver", a short explanation, and the buttons **View all files**
  (filled) and **Manage all files** (outlined). Each opens the access dialog
  (see 11) with that level chosen.
- **With access:** `/pub` and `/priv` as folders. Every listing has a yellow
  banner: "You're browsing all files on your homeserver. Files outside Pubky
  Drive belong to other apps; changing them can break those apps." With View
  access it adds "View only" and an **Allow changes** button.
- The app's own folders (`/pub/pubky-drive/`, `/priv/pubky-drive/`) carry a
  "Pubky Drive" badge; the Drive folders inside them carry "Opens in My Drive"
  and open there.
- With View access, items outside Pubky Drive can be opened, previewed,
  downloaded and starred, but menu items that change them are disabled, and
  they can't be dragged or dropped onto. New and uploads go to the private
  Drive area.
- Moving items between My Drive and the rest of the homeserver asks first:
  "Move into your Drive?" or "Move out of your Drive?".
