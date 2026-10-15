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

- Dialog "Rename" with the current name, fully selected (extension included,
  as in Drive). Buttons **Cancel** and **OK**.
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
  - Tabs **Suggested** (selected when the dialog opens), **Starred** and **All
    locations**, and a **Search** button.
    - Suggested: up to 8 Drive folders where files were written most recently,
      from the session's event history, filled up with the folders next to the
      moved items.
    - Starred: the starred folders, by name.
    - All locations: a folder browser starting in the current folder's parent,
      with a back arrow and the browsed folder's name at the top, then its
      subfolders.
    - Search replaces the tabs with a field ("Search folders") that lists Drive
      folders whose name contains the text. Esc or × closes it.
  - Folders in Suggested, Starred and search results show their location under
    the name. A single click selects a folder; a double click, or the › button
    at the row's end, opens it in All locations.
  - "Move to: <path>" under the list, for the selected folder or, in All
    locations, the browsed one. Otherwise: "Select a location to show the
    folder path".
  - **Cancel** and **Move**. Move is disabled when the target is the current
    location, or is inside the moved folder.
- Moving between the Public and Private areas warns what changes, for example:
  "These files will become public. Anyone with the address can read them."
- Snackbar: "‘name’ moved from ‘source’ to ‘target’" with **Undo**, naming the
  folders (or the area, for an area root). Items from different folders: "N
  items moved to ‘target’".

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

Every rename, copy, move, star change, area change and move to bin goes into
the session's undo history (the last 50 actions).

- The snackbar's **Undo** reverses that action, as long as the snackbar is
  visible.
- ⌘Z reverses the latest action that isn't undone yet, and ⌘Y or ⇧⌘Z redoes
  the latest undone one. Snackbar: "Action undone" or "Action redone", as in
  Drive.
- A new action clears what could be redone. Creating folders, uploading and
  deleting forever can't be undone.
- Undoing a copy deletes it; redoing makes it again.

## Multi-file progress and failures

Operations on several files show "Moving 3 of 12…" in a persistent snackbar.
If a step fails, the operation stops and reports "Moved 5 of 12. Couldn't move
‘name’: <reason>". Files are never deleted from their original location before
their copy was written.
