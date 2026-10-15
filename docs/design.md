# Design: a file explorer on a Pubky Homeserver

Pubky Drive is a browser file explorer for the files on your own Pubky
Homeserver. It offers the usual file-manager features (folders, upload, move,
star, bin, search, sharing) and builds each of them on what the Homeserver
provides. This document explains those mappings. The numbered documents in
[`spec/`](spec/README.md) describe the user interface.

It targets `@synonymdev/pubky` 0.16.1 and Homeservers of the same release.

## What the Homeserver provides

A Homeserver stores files under absolute paths for each user. It doesn't store
folders, file IDs or any metadata beyond what HTTP needs. From the SDK, the app
can:

- **List** a directory (`session.storage.list(path, cursor, reverse, limit,
shallow)`). A shallow listing returns the direct children; child directories
  end with `/`. Pages are limited; the last entry is the cursor for the next
  page.
- **Read metadata** with `stats(path)`: size (`contentLength`), media type
  (`contentType`), `lastModifiedMs` and `etag`. The Homeserver detects the
  media type from the file's first bytes, then from its extension.
- **Read and write** whole files (`getBytes`, `putBytes`) and **delete** files.
  There is no server-side copy, move or rename.
- **Read public files without signing in** (`pubky.publicStorage`).
- **Stream events** (`pubky.eventStreamForUser`): every write (`PUT`) and
  delete (`DEL`) under a path, newest first or live.

Paths must follow the Homeserver's rules: segments of at most 255 bytes,
whole paths of at most 972 bytes, and no control characters, backslashes,
trailing whitespace, `.` or `..` segments.

### Path encoding

The SDK APIs expect paths in different forms. Tests against a 0.16.1 testnet
showed:

| API                                                             | Path form                                                      | Example for the name `a b.txt` |
| --------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `session.storage` methods                                       | Plain names; the SDK encodes them                              | `/pub/x/a b.txt`               |
| `publicStorage` addresses, event `path()` filters, viewer links | Each segment percent-encoded once, with URL path-segment rules | `/pub/x/a%20b.txt`             |
| URLs returned by `list()` and event paths                       | Each segment percent-encoded twice                             | `/pub/x/a%2520b.txt`           |

The app keeps plain paths internally. It decodes listed and event paths twice,
and encodes a segment once when it builds a public address or an event filter.
URL path-segment rules leave characters such as `:` and `,` unencoded;
`encodeURIComponent` encodes them, and the Homeserver then reports 404.

A backslash in a name turns into a `/` on the way to the Homeserver, so names
with backslashes are rejected.

## Areas: public and private

Every file lives in one of two **areas**:

| Area                | Who can read                                     | Shown as             |
| ------------------- | ------------------------------------------------ | -------------------- |
| Public (`/pub/…`)   | Anyone who knows the address, without signing in | Globe icon, "Public" |
| Private (`/priv/…`) | You, and apps you authorize to read it           | Lock icon, "Private" |

Private means access-controlled, not encrypted: the Homeserver operator can
read private files. The app says this wherever it asks you to choose an area.

"Pubky Drive" shows the two areas as top-level folders. Changing a file's general
access in the share dialog moves the file to the same relative path in the
other area of the same section.

## Two sections: Pubky Drive and Homeserver

**Pubky Drive** holds the files Pubky Drive manages. Its Public and Private areas
are always the Drive folders, `/pub/pubky-drive/files/` and
`/priv/pubky-drive/files/`, whatever else the session may access. New folders,
uploads, Recent and search work in Pubky Drive.

The **Homeserver** section shows the raw storage, `/pub/` and `/priv/`,
including other apps' data. It uses raw names in its breadcrumbs
(`Homeserver › /pub › pubky.app`), shows a warning above every listing, and
marks the app's own folders. A path inside the Drive folders always opens in My
Drive, so the same file never appears in both sections with different names.

## Access levels

Sign-in asks Pubky Ring only for the Drive folder. Wider access is requested
later, from the Homeserver section or the account menu, and replaces the
session after Pubky Ring approves it:

| Level            | Requested capabilities                       | What it allows                                |
| ---------------- | -------------------------------------------- | --------------------------------------------- |
| Drive folder     | `/pub/pubky-drive/:rw,/priv/pubky-drive/:rw` | Pubky Drive, Starred and Bin                  |
| View all files   | The Drive folder, plus `/pub/:r,/priv/:r`    | Also browse, preview and download any file    |
| Manage all files | `/pub/:rw,/priv/:rw`                         | Also create, rename, move and delete any file |

Pubky Ring can approve fewer capabilities than requested. The app reads the
approved capabilities from `session.info.capabilities`, not from the request.
Whether an item can be changed is decided per path (`canWrite` in
`src/drive/access.ts`): inside a Drive folder or the app's data folders, or
anywhere in an area with Manage access. Menus, drag and drop and shortcuts
disable changes to other items; with View access the Homeserver section is
read-only.

The new session must belong to the identity that is signed in; a different
identity is refused. After saving the new session, the app ends the old one.

Moving items between Pubky Drive and the rest of the homeserver asks for
confirmation, because apps that read the old location won't find them.

## App data

Data that the Homeserver doesn't store for files lives in the app's private
folder, `/priv/pubky-drive/`:

| Path                                          | Content                                              |
| --------------------------------------------- | ---------------------------------------------------- |
| `/priv/pubky-drive/app/starred.json`          | The paths of starred items                           |
| `/priv/pubky-drive/bin/<entry-id>/entry.json` | A binned item's original path, kind and binning time |
| `/priv/pubky-drive/bin/<entry-id>/content/…`  | The binned item's files                              |

Pubky Drive never lists `app/` or `bin/`, because they're outside the Drive
folders. The Homeserver section lists them like any other folder, with "App
data" and "Bin" badges and a second banner inside `/pub/pubky-drive/` and
`/priv/pubky-drive/`: changing them by hand can break the bin and starred
items. Pubky Drive skips bin entries whose record it can't read. Starred items
can be anywhere, including the Homeserver section; Restore only writes inside
the areas the session can access.

## Folders

Directories exist only while they contain a file. To keep an empty folder,
the app writes a zero-byte marker file named `.keep` into it. Pubky Drive, Recent
and search hide `.keep` files; the Homeserver section shows them with a "Folder
marker" badge, because it shows exactly what is stored. When a folder gets its first real file, the marker stays; it is
removed together with the folder.

A folder's modified time is not available from the Homeserver, so folder rows
show "—" for date and size.

## Operations without server support

The Homeserver has no copy, move or rename. The app builds them from
reads, writes and deletes:

| Operation                     | Steps                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Copy a file                   | Read the bytes, write them to the new path.                                                      |
| Move or rename a file         | Copy, then delete the original.                                                                  |
| Move, rename or copy a folder | List every file below it, then copy (and for a move, delete) each one.                           |
| Move to bin                   | Move the item into a new bin entry and write `entry.json`.                                       |
| Restore                       | Move the content back to the original path. If that name is taken, add a number: `name (1).txt`. |

Each multi-file operation shows progress. These operations aren't atomic: if
one step fails, the app stops, reports which files were already moved, and
leaves both copies in place rather than deleting data. Before writing, the app
checks that the destination name is free, so an operation never overwrites a
file silently.

Large files are read into memory for these steps, because the SDK has no
streaming upload. The app warns before uploading or copying files over 100 MB.

## Starred, Recent and search

- **Starred** reads `starred.json`. Moving or renaming a starred item updates
  its stored path; deleting it removes the entry.
- **Recent** reads the session's event history (see "Live updates and rate
  limits"), keeps the latest write per path, skips deleted paths and hidden
  files, and groups the result by day.
- **Search** lists both areas recursively and matches names that contain the
  query (case-insensitive). Results show their folder in a Location column.

## Bin

Moving an item to the bin moves its content to
`/priv/pubky-drive/bin/<entry-id>/content/` and records where it came from.
Public files therefore stop being public when they are binned. Copies that
others already downloaded can't be recalled.

When the app starts, it deletes bin entries older than 30 days. Delete forever
and Empty bin ask for confirmation.

## Sharing links

A public file has two addresses:

- The **Pubky address**, `pubky<public-key>/pub/…/name`, which other Pubky
  apps and Pubky Explorer understand.
- A **viewer link** into this app, `#/view/pubky<public-key>/pub/…/name`. The
  viewer opens without signing in, previews the file with public storage, and
  offers a download.

"Copy link" copies the viewer link. Private files have no link; the share
dialog explains how to make a file public instead. Sharing with specific
people isn't possible, because Homeservers don't grant access to other
identities.

## Live updates and rate limits

The production homeserver (`homeserver.pubky.app`) limits requests per IP or
user. The limits that matter here:

| Request              | Limit                           |
| -------------------- | ------------------------------- |
| `GET /events-stream` | 1 per second per IP, burst 5    |
| `DELETE /pub/**`     | 5 per second per user, burst 50 |
| Writes               | 1 MB/s per user by default      |

`e2e/homeserver-rate-limited.toml` runs the local testnet with the same limits.

**One event stream per session.** An `EventHub` (`src/pubky/eventHub.ts`)
loads the newest 300 events of all watched folders in one request, then follows
one live stream from the newest event. It watches the Drive folders, or the
storage roots of areas with homeserver access. When the stream drops or is
rate-limited, it reconnects with exponential backoff and jitter, resuming from
the last event it saw, so nothing is missed. Open folders reload when an event
arrives below them; Recent reads the hub's history and makes no event requests
of its own. Signing in and browsing costs two event-stream requests per session.

**Retrying.** Storage requests that get `429` or `503` wait and retry with
backoff, up to eight attempts (`src/drive/retryingFileStore.ts`). The SDK
doesn't expose the `Retry-After` header, so the app picks its own delays.
Deletes under `/pub/` are paced at 4 per second after a burst of 40, below the
homeserver's limit, so long operations rarely get refused. While an operation
waits, its progress message says that the homeserver is busy.

**Other tabs.** A tab that signs in, changes access or signs out saves or
forgets the session in local storage; other tabs follow that change instead of
using a session that may have been revoked.

## Not included

- Storage quota display: the SDK doesn't report quota or usage. A full quota
  shows the Homeserver's error (`507 Insufficient Storage`) when uploading.
- Versions, activity history, comments, descriptions, shortcuts and offline
  mode.
- End-to-end encryption of private files. SDK 0.16 can deliver encryption keys
  scoped to paths, which a later version could use to encrypt private files.
