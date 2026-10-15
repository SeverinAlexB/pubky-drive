# 08 Preview and details (P1)

## Preview

Double-click, Enter or **Preview** opens a full-window overlay with a dark,
translucent background (`rgba(0, 0, 0, 0.85)`).

- **Top bar** (64px): close (×), file icon and name, and at the right
  Download and Share (when available) as white icon-and-label buttons.
- **Content**, centred:
  - Images: fitted to the window, with zoom in, zoom out and fit buttons.
  - PDFs: the browser's PDF viewer in a white frame.
  - Text, Markdown, JSON and code: monospaced text on a white page, up to
    1 MB. Larger files show the first 1 MB and a note.
  - Audio and video: the browser's player.
  - Other types: "No preview available", the type and size, and a
    **Download** button.
- **Previous and next** round buttons at the left and right edges (and ← →)
  move through the files of the list. Folders are skipped.
- Esc or × closes the preview and selects the previewed file.
- While loading, a spinner shows; errors show their message.

## Details pane

**View details** (info button, ⌥V then D) toggles a pane at the right of the
content card. The pane remembers being open.

- **Header:** the item's icon and name, and a close button.
- **Preview:** for images, a thumbnail; for other files, a large type icon.
- **Who has access:** "Public: anyone with the address" (globe) or "Private:
  only you and apps you authorize" (lock), and a **Manage access** button that
  opens the share dialog.
- **File details:** Type, Size, Location (link to the folder), Owner (shortened
  public key and "me"), Modified, Path (the full Homeserver path, copyable).
- For folders: Type "Folder", Location, Owner and Path; size and dates
  aren't available.
- With several items selected: "N items selected".
- With nothing selected: "Select an item to see the details".
