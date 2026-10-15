[![Pubky](https://img.shields.io/badge/Pubky-0.16.1-blue)](https://www.npmjs.com/package/@synonymdev/pubky/v/0.16.1)

# Pubky Drive

A file explorer for your [Pubky](https://pubky.org) Homeserver, modelled on Google Drive. It
runs entirely in the browser and talks directly to your Homeserver, without its own backend.

## Features

- **Public and private areas.** "My Drive" shows your public files (`/pub/…`, readable by anyone
  with the address) and your private files (`/priv/…`, readable only by you and apps you
  authorize).
- **Homeserver section** for browsing, and optionally managing, everything on your Homeserver,
  including other apps' data.
- **Browse** folders with breadcrumbs, a list or grid layout, sorting, a type filter and a details
  pane.
- **Upload** files and folders with the New menu or by dragging them from your computer; download
  files, or folders as a ZIP file.
- **Organise:** new folder, rename, make a copy, move (dialog or drag and drop) and star, with Undo.
- **Bin:** binned items stay restorable for 30 days.
- **Preview** images, PDFs, text, audio and video.
- **Share:** make an item public or private, and copy a link that opens in a public viewer
  without signing in.
- **Search** by name across both areas, and see recently changed files.
- **Live updates** when another device or app changes the open folder.
- Keyboard shortcuts; press <kbd>⌘</kbd> + <kbd>/</kbd> (<kbd>Ctrl</kbd> + <kbd>/</kbd>) to list
  them.

**Private means access-controlled, not encrypted.** The Homeserver operator can read private
files. Homeservers can't share files with specific people, so sharing means making an item public.

## Access levels

When you sign in with [Pubky Ring](https://pubkyring.app/), Pubky Drive asks only for its own
folder. **My Drive** (Public and Private) always shows that folder:
`/pub/pubky-drive/files/` and `/priv/pubky-drive/files/`.

The **Homeserver** section in the sidebar shows your whole storage, `/pub/` and `/priv/`,
including other apps' data. Opening it the first time asks for more access, which you approve in
Pubky Ring:

| Level            | Capabilities requested                       | What you can do                               |
| ---------------- | -------------------------------------------- | --------------------------------------------- |
| Drive folder     | `/pub/pubky-drive/:rw,/priv/pubky-drive/:rw` | Everything in My Drive, Starred and Bin       |
| View all files   | The Drive folder, plus `/pub/:r,/priv/:r`    | Also browse, preview and download any file    |
| Manage all files | `/pub/:rw,/priv/:rw`                         | Also create, rename, move and delete any file |

You can change the level at any time with **Change access…** in the account menu. Starred items
and the bin are stored under `/priv/pubky-drive/`. Changing other apps' data can break those apps.

## Quick start

Requires Node.js 20.19+ or 22.12+.

1. Start a local Pubky testnet. Its version should match the SDK:

   ```bash
   cargo install pubky-testnet@0.16.1 --locked
   pubky-testnet
   ```

2. Install and start the app:

   ```bash
   npm install
   npm run dev
   ```

3. Open the address that Vite prints, such as `http://localhost:5173`. On testnet, use **New
   identity** to create a test account and sign in in one step, or approve the sign-in with the
   [Pubky Ring Simulator](https://simulator.pubkyring.app).

The app uses the local testnet by default. Set `VITE_PUBKY_TESTNET=false` to use mainnet.

## Configuration

| Variable                       | Default                                                 | Purpose                                                              |
| ------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------- |
| `VITE_PUBKY_TESTNET`           | `true`                                                  | `false` uses mainnet relays and Homeservers.                         |
| `VITE_PUBKY_TESTNET_HOST`      | `localhost`                                             | Host of the local testnet.                                           |
| `VITE_PUBKY_HTTP_RELAY`        | Testnet relay on port 15412; Synonym's relay on mainnet | HTTP relay for Pubky Ring sign-in. Run your own relay in production. |
| `VITE_PUBKY_STORAGE_NAMESPACE` | None                                                    | Keeps saved sessions apart when several builds share an origin.      |
| `VITE_SHOW_DEVELOPMENT_SIGNUP` | `true` in `vite dev` on testnet                         | `false` hides the **New identity** shortcut.                         |

App constants, such as the app folder name, the bin retention period and the large-file
threshold, live in [`src/config.ts`](src/config.ts).

## Deploy

`npm run build` writes a static site to `dist/`. The app uses hash routes (`#/drive/…`), so any
static host works without rewrite rules. Production builds only offer Pubky Ring sign-in.

## Development

| Command         | What it does                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`   | Starts the development server.                                                                                                 |
| `npm test`      | Runs the unit tests (Vitest). They don't need a Homeserver.                                                                    |
| `npm run e2e`   | Runs the browser tests (Playwright, with your installed Google Chrome) against the local testnet. Start `pubky-testnet` first. |
| `npm run check` | Checks formatting (Prettier) and lints the code and workflows.                                                                 |
| `npm run build` | Type-checks and builds the app.                                                                                                |

The code is organised by feature:

- `src/drive/`: paths, names, listings and operations on the Homeserver.
- `src/features/`: one folder per feature, such as `browse`, `upload`, `bin` or `sharing`.
- `src/pubky/`: sign-in, sessions and event streams.
- `src/ui/`: shared components: dialogs, menus, the snackbar and icons.

## Documentation

- [Design](docs/design.md): how Drive features map onto a Homeserver, including path encoding,
  folders, the bin and the operations the Homeserver doesn't provide.
- [Specification](docs/spec/README.md): what each part of the interface shows and does.
- [Research notes](docs/research.md): the Google Drive behaviour that the specification is based on.

## Limitations

- Copy, move and rename read and rewrite every file, because Homeservers have no server-side copy
  or move. They aren't atomic: if one step fails, earlier files stay at their new place and the
  app reports how far it got.
- Uploads and copies keep each file in memory; the app asks before uploading files over 100 MB.
- Storage quota isn't shown, because the SDK doesn't report it. A full quota shows the
  Homeserver's error when uploading.
- No versions, comments, activity history or offline mode.
