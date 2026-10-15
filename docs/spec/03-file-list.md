# 03 File list (P1)

## List view

The list is a grid with these columns:

| Column        | Width | Content                                          |
| ------------- | ----- | ------------------------------------------------ |
| Name          | Rest  | File-type icon, name, a star after starred items |
| Owner         | 140px | "me"                                             |
| Date modified | 140px | See "Dates" below; "—" for folders               |
| File size     | 120px | See "Sizes" below; "—" for folders               |
| Actions       | 48px  | "More actions" (⋮) button                        |

- The header row is 48px high with a bottom divider. Rows are 48px high with a
  divider between them.
- Hovering a row shows a light grey background. A selected row has a light blue
  background.
- Recent and search results replace Owner with **Location** (the folder,
  as a link). The bin replaces Date modified with **Date binned**.

### Dates

- Today: time of day, such as `10:13`.
- This year: day and month, such as `24 Aug`.
- Earlier: day, month and year, such as `28 Nov 2024`.

Dates use the browser's locale.

### Sizes

`0 bytes`, `47 bytes`, `103 KB`, `2.2 MB`, `1.4 GB`, with 1 KB = 1,024 bytes.
Values under 10 of a unit have one decimal place.

## Grid view

- Folders appear first as tiles, 48px high, in columns of at least 200px. Each
  shows the folder icon, the name and ⋮.
- Files appear below as cards of at least 200px wide and 240px high: a header
  with the icon, name and ⋮, and a preview area. Images show a thumbnail; other
  files show a large type icon.
- The toggle (⌥V then L) switches between list and grid. The choice is saved
  in the browser.

## Sorting

- Clicking the Name, Date modified or File size header sorts by that column.
  Clicking it again reverses the order. The active header shows an arrow.
- The sort button (right end of the header row) opens the sort menu:
  - Sort by: Name, Date modified, File size
  - Sort direction: A to Z / Z to A, or Oldest first / Newest first
  - Folders: On top (default) / Mixed with files
- The default is Name, A to Z, folders on top. Names sort with natural number
  order (`file 2` before `file 10`).

## Filter bar

- **P1:** a **Type** chip: Folders, Images, PDFs, Text and code, Audio, Video,
  Archives, Other. Choosing a type filters the current list and shows the chip
  as active with a clear (×) button.
- **P2:** a **Modified** chip: Today, Last 7 days, Last 30 days, This year,
  Last year.

## Selection

- Click selects one item. ⌘-click (Ctrl-click on other systems) toggles an
  item. Shift-click selects a range.
- Arrow keys move the selection; Shift+arrows extend it. ⌘A selects all
  visible items. Esc clears the selection.
- Clicking empty space in the list clears the selection.
- While items are selected, the filter bar is replaced by the **selection bar**
  (see 04).

## Opening items

- Double-click or Enter opens a folder, or previews a file (see 08).

## States

- **Loading:** three placeholder rows with a soft pulse.
- **Empty folder:** an illustration-free empty state: "Drop files here" and
  "or use the New button".
- **Error:** the message and a **Try again** button.
