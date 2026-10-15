# 05 Upload and download (P1)

## Starting an upload

- **File upload** opens the browser's file picker with multiple selection.
- **Folder upload** opens the folder picker. The folder structure is kept.
- **Drag and drop:** dragging files or folders from the computer over the list
  shows a blue outline around the list and the caption "Drop files to upload
  to <folder>". Dropping on a folder row uploads into that folder.
- Uploads go to the open folder. In My Drive they go to the Private area.

## Name conflicts

If a file with the same name exists, the upload keeps both: the new file gets
a number, `name (1).ext`, `name (2).ext`, and so on. P2: ask whether to
replace or keep both.

## Upload panel

A panel docks at the bottom right, 360px wide, above the snackbar area:

- Title: "Uploading N items", then "N uploads complete" or "N uploads
  failed".
- Collapse (˅) and close (×) buttons. Closing while uploads run asks for
  confirmation and cancels the remaining uploads.
- A status line "Starting uploads…" or "N left" with **Cancel**.
- One row per file: icon, name, and at the right a spinner, a green check, or
  a red error icon with the error text as a tooltip and a **Retry** button.

Files upload two at a time. The SDK can't report progress within one file, so
each row shows a spinner rather than a percentage.

Files larger than 100 MB ask for confirmation first, because the app keeps the
whole file in memory while uploading. A full quota shows "Your homeserver
storage is full".

## Download

- **Download** on one file saves it under its name.
- **Download** on a folder or several items saves a ZIP file named after the
  folder, or `pubky-drive-<date>.zip` for a selection. A snackbar shows
  "Preparing download…" while files are read.
