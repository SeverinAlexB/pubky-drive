# Google Drive research notes

Observed on 2026-10-15 in Google Drive's web app (`drive.google.com/drive/`),
using REA 6.4.0 (passive CDP inspection: accessibility tree, screenshots) and
Playwright scripts that opened menus and dialogs. Actions that change data,
such as rename, move, copy, star, bin and delete forever, ran only on throwaway
files in a scratch folder. Captures, cookies and the account's own file names
were kept outside this repository.

These notes inform the specification in [`spec/`](spec/README.md). No Google
code, styles, fonts, icons or other assets are reused.

## Window structure

The window has three bands: a header (search and account controls), a left
navigation column, and a white rounded content card. A narrow strip on the right
holds links to other Google apps; it isn't relevant here.

- **Header (64px high):** product logo and name, a wide rounded search field
  ("Search in Drive") with an "Advanced search" button, then help, settings and
  account buttons.
- **Left column (256px wide):**
  - A raised **New** button with a plus icon.
  - A navigation tree, "Folders and views": Home, My Drive (expandable),
    Computers, Shared with me, Recent, Starred, Spam, Bin, Storage. The current
    view has a pill-shaped, light blue highlight.
  - A storage meter ("10.01 GB of 15 GB used") and a "Get more storage"
    button.
- **Content card:** a page title row, a filter chip row, then the item list.

## Folder pages

- The **title row** shows the location. Inside a folder it becomes a
  breadcrumb: `My Drive › pubky-drive-research ▾`. Earlier segments are links;
  the last segment opens the folder menu.
- Right of the title: a **list/grid toggle** (two joined pill buttons with a
  check mark on the active one) and a **View details** button (info icon).
- **Filter chips:** Type, People, Modified, Source. Search results add
  Location, "Title only" and "To do".
- **List view columns:** Name (sortable, with an arrow), Owner, Date
  modified, File size, then a sort-options button. Each row is 48px high and has
  a file-type icon, the name, the owner, the date (time of day for today, day
  and month for this year, full date otherwise), the size ("—" for folders,
  "47 bytes", "103 KB", "2.2 MB") and a "More actions" (⋮) button.
- Folders are listed before files by default ("Folders: On top").
- **Grid view:** folders appear as compact tiles (icon, name, ⋮) in a separate
  row above file cards. File cards show the icon and name above a large
  thumbnail.
- **Empty folder:** an illustration with "Drop files here" and "or use the
  'New' button."

## Selection

- Clicking a row selects it (light blue background). ⌘-click adds to the
  selection, Shift-click selects a range.
- While items are selected, the filter chips are replaced by a **selection
  bar**: Clear selection (×), "N selected", Share, Download, Move, Move to bin,
  Copy link (Copy links for several), More actions (⋮).
- With several items selected, More actions disables Rename and File
  information.

## Menus

**New menu** (also the current-folder menu, opened from the last breadcrumb):

- New folder (`Ctrl+C then F`)
- File upload (`Ctrl+C then U`), Folder upload (`Ctrl+C then I`)
- Google app documents (not relevant)

**Context menu for a file** (right-click or ⋮):

- Open with › Preview (⌥⌘P), Open in new tab
- Download
- Rename (⌥⌘E)
- Make a copy (⌘C then ⌘V)
- Share › Share (⌃⌥⌘A), Copy link
- Organise › Move (⌥⌘M), Add shortcut, Add to starred (⌥⌘S)
- File information › Details, Activity, Manage versions
- Move to bin (Delete)

The **folder** menu has the same entries except Open with and Make a copy; the
current-folder menu adds New folder at the top.

**Sort menu:** Name, Date modified, Date modified by me, Date opened by me;
A to Z or Z to A; folders on top or mixed with files.

**Type filter:** Folders, Documents, Spreadsheets, Presentations, Photos &
images, PDFs, Videos, Archives (zip), Audio, and Google-specific types.
**Modified filter:** Today, Last 7 days, Last 30 days, This year, Last year,
Custom date range.

## Dialogs and notifications

- **New folder:** a small dialog titled "New folder" with a text field
  pre-filled with "Untitled folder" (fully selected), and Cancel/Create
  buttons. Success shows "‘name’ created successfully."
- **Rename:** "Rename" dialog with the current name selected (including the
  extension), Cancel/OK. The notification reads
  "‘old’ renamed to ‘new’" with **Undo**.
- **Make a copy:** creates "Copy of name" in the same folder. Notification:
  "Created "Copy of name"." with Undo.
- **Move:** a dialog "Move name" showing "Current location: folder", tabs
  Suggested / Starred / All locations, a search button, a folder list (each
  folder can be opened to browse inside it), the selected path at the bottom,
  and Cancel/Move (Move is disabled until a different folder is selected).
  Notification: "name has been moved from ‘a’ to ‘b’" with Undo.
- **Drag and drop:** dragging a row shows a small card with the item name.
  Hovering over a folder row highlights it with an outline. Dropping moves the
  item, with the same notification.
- **Star:** "1 file added to starred" with Undo; starred items show a small
  star after the name.
- **Copy link:** "Link copied" with a "Manage access" action.
- **Share:** "Share ‘name’" dialog with an "Add people" field, "People with
  access" (the owner), **General access** (Restricted, or anyone with the link)
  with a description line, "Copy link" and "Done".
- **Upload:** a panel docks to the bottom right: "Uploading 4 items", a
  "Starting uploads…" line with Cancel, then one row per file with its icon and
  a progress circle that turns into a green check. The title becomes
  "4 uploads complete". The panel can be collapsed or closed.
- Notifications appear as a dark snackbar at the bottom left, with an optional
  action (Undo) and a close button.

## Details pane

"View details" opens a right-hand pane (about 320px wide) for the selected
item, with Details and Activity tabs. Details shows a thumbnail, "Add
description", **Who has access** ("Private to you", Manage access), and **File
details**: Type, Size, Storage used, Location (a link to the folder), Owner,
Modified (date and by whom), Opened, Created. With nothing selected the pane
says "Select an item to see the details".

## Preview

Double-clicking a file opens a full-window dark overlay over the list:

- Top bar: close (×), file icon and name, a "move" button, then "Open with" and
  "Share" on the right.
- A toolbar with download, print and zoom (and page number for PDFs).
- PDFs show page thumbnails at the left; text files are shown as monospaced
  text on a white page.
- Previous/next arrows move between files in the folder; Escape closes.

## Views

- **Recent:** files only, grouped under headings (Today, Yesterday, Earlier
  this week, Last week, …), with a Location column.
- **Starred:** starred items in a normal list.
- **Bin:** title "Bin", a banner "Items in the bin will be deleted forever
  after 30 days" with an **Empty bin** action, and a "Date binned" column
  grouped by day. The context menu offers **Restore from bin** and **Delete
  forever**. Delete forever asks for confirmation: "Delete forever?
  ‘name’ will be deleted forever. This can't be undone."
- **Search:** typing shows a suggestion list of matching items. Enter opens
  "Search results" (`/drive/search?q=…`) with extra filter chips and a
  Location-aware list.
- **Storage:** used space with a coloured bar, and files sorted by storage
  used.

## Keyboard shortcuts (selection)

| Action                   | Shortcut                        |
| ------------------------ | ------------------------------- |
| Move selection           | Arrow keys; Shift+arrows extend |
| Select all visible items | ⌘A                              |
| Clear selection          | Esc                             |
| Open item                | Enter                           |
| Rename                   | F2 or ⌥⌘E                       |
| Move to bin              | Delete or Backspace             |
| Move selected items      | ⌥⌘M                             |
| Add or remove star       | ⌥⌘S                             |
| Preview                  | ⌥⌘P                             |
| Go up one folder         | ⌥↑                              |
| Search                   | `/`                             |
| Toggle list and grid     | ⌥V then L                       |
| Show or hide details     | ⌥V then D                       |
| Copy, cut, paste items   | ⌘C, ⌘X, ⌘V                      |
| Undo, redo               | ⌘Z, ⌘Y                          |
| Show keyboard shortcuts  | ⌘/                              |
