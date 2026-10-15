# 06 Organise (P1)

## Dialogs

Dialogs are centred, 400px wide (the move dialog 600px), with 28px rounded
corners and a 22px title. A dimmed backdrop covers the window. Enter confirms
and Esc cancels.

## New folder

- Dialog "New folder" with a text field pre-filled with "Untitled folder",
  fully selected, and the buttons **Cancel** and **Create**.
- The folder appears in the list. Snackbar: "‘name’ created".

## Rename

- Dialog "Rename" with the current name. For files, the name without the
  extension is selected; for folders, the whole name. Buttons **Cancel** and
  **OK**.
- Snackbar: "‘old’ renamed to ‘new’" with **Undo**.
- Renaming a folder moves every file inside it, with progress in the snackbar
  ("Renaming 12 files…").

## Name rules

Names can't be empty, contain `/` or `\`, be `.` or `..`, end with a space,
or exceed 255 bytes. Names starting with `.keep` are reserved. The dialog shows
the reason under the field and disables the confirm button. A name that already
exists in the folder shows "An item named ‘name’ already exists".

## Make a copy

Creates "Copy of name" in the same folder (with a number if taken). Snackbar:
"Created ‘Copy of name’" with **Undo**, which deletes the copy.

## Move

- Dialog "Move ‘name’" (or "Move N items"):
  - "Current location:" followed by a chip with the folder name.
  - A folder browser starting in the current folder's parent: a back arrow and
    the browsed folder's name at the top, then its subfolders. A single click
    selects a folder; a double click, or the › button at the row's end, opens it.
  - "Move to: <path>" under the list, for the selected or browsed folder.
  - **Cancel** and **Move**. Move is disabled when the target is the current
    location, or is inside the moved folder.
- Moving between the Public and Private areas warns what changes, for example:
  "These files will become public. Anyone with the address can read them."
- Snackbar: "‘name’ moved to ‘folder’" with **Undo**.

## Drag and drop

- Dragging selected items shows a small card with the first name and a count
  ("+2").
- Hovering a folder row, a breadcrumb segment, or the Public or Private
  sidebar item highlights it with an accent outline. Dropping moves the items
  there.
- Dropping onto the item's own folder does nothing.

## Star

- **Add to starred** marks the item with a small star after its name and adds
  it to Starred. Snackbar: "1 item added to starred" with **Undo**.
- **Remove from starred** reverses it.

## Undo

Undo reverses the last organise operation (rename, copy, move or star) as long
as its snackbar is visible.

## Multi-file progress and failures

Operations on several files show "Moving 3 of 12…" in a persistent snackbar.
If a step fails, the operation stops and reports "Moved 5 of 12. Couldn't move
‘name’: <reason>". Files are never deleted from their original location before
their copy was written.
