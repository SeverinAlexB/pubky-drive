# 04 Menus and shortcuts (P1)

Menus are 280px wide with 8px rounded corners and a shadow. Items are 32px
high with an icon, the label, and the shortcut right-aligned in grey.
Separators group related items. Menus close with Esc, a click outside, or after
choosing an item, and support arrow-key navigation.

## New menu

Opened from the **New** button or the current-folder menu.

- New folder (`Ctrl+C then F`)

---

- File upload (`Ctrl+C then U`)
- Folder upload (`Ctrl+C then I`)

In My Drive, which only contains the two areas, the New menu creates items in
the **Private** area and says so in a small caption ("Adds to Private").

## Item context menu

Opened by right-clicking an item or with its ⋮ button. When the item isn't
selected, right-clicking selects it first.

For a **file**:

- Preview (⌥⌘P)

---

- Download
- Rename (F2)
- Make a copy

---

- Share › Share, Copy link
- Organise › Move (⌥⌘M), Add to starred / Remove from starred (⌥⌘S)
- File information › Details (⌥V then D)

---

- Move to bin (Delete)

For a **folder**: the same, without Preview and Make a copy. Copy link for a
folder copies the viewer link of the folder (public area only).

With **several items** selected: Download, Share, Organise and Move to bin.
Rename, Make a copy and File information are disabled.

## Current-folder menu

Opened from the last breadcrumb segment: New folder, ---, File upload, Folder
upload, ---, Rename, Share, Organise, File information, ---, Move to bin. The
area roots (Public, Private) only offer the New items.

## Empty-space menu

Right-clicking empty space in a folder's list clears the selection and opens
the New items only: New folder, ---, File upload, Folder upload. In views
without a folder (Recent, Starred, search, Bin) and in read-only folders,
nothing opens.

## Selection bar

Replaces the filter bar while items are selected. It is 40px high with a light
grey, fully rounded background:

Clear selection (×), "N selected", Share, Download, Move, Move to bin, Copy
link (or Copy links), More actions (⋮, which opens the context menu for the
selection).

## Keyboard shortcuts

| Action                  | Shortcut            |
| ----------------------- | ------------------- |
| Move selection          | Arrow keys          |
| Extend selection        | Shift+arrow keys    |
| Select all              | ⌘A                  |
| Clear selection         | Esc                 |
| Open                    | Enter               |
| Rename                  | F2                  |
| Move to bin             | Delete or Backspace |
| Move                    | ⌥⌘M                 |
| Star or unstar          | ⌥⌘S                 |
| Preview                 | ⌥⌘P                 |
| Copy link               | ⌥⌘C                 |
| Go up one folder        | ⌥↑                  |
| Search                  | `/`                 |
| New folder              | Ctrl+C then F       |
| Upload files            | Ctrl+C then U       |
| Toggle list and grid    | ⌥V then L           |
| Show or hide details    | ⌥V then D           |
| Show keyboard shortcuts | ⌘/                  |

⌘ is Ctrl on Windows and Linux. Shortcuts don't fire while a text field has
focus, except Esc.

**P2:** copy, cut and paste items (⌘C, ⌘X, ⌘V), and undo and redo (⌘Z, ⌘Y).

## Keyboard shortcuts dialog

⌘/ opens a dialog titled "Keyboard shortcuts" that lists the table above in
groups: Selection, Navigation, Actions, Create, View.
