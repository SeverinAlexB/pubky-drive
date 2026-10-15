# 07 Bin (P1)

## Move to bin

- **Move to bin** (Delete or Backspace) moves the selected items to the bin.
  Snackbar: "‘name’ moved to bin" or "N items moved to bin", with **Undo**.
- A public item moved to the bin stops being public.

## Bin view

- Title "Bin".
- A banner, light grey with 8px corners: "Items in the bin are deleted
  forever after 30 days", with an **Empty bin** text button at the right.
- Columns: Name, Original location, Date binned, File size. Rows are grouped
  under day headings (Today, Yesterday, Earlier this week, Earlier this month,
  Older).
- Binned folders can't be opened; their context menu shows their item count.
- Empty state: "Nothing in the bin".

## Bin context menu

- Restore

---

- Delete forever

## Restore

Moves the item back to its original location, recreating missing folders. If
the name is taken there, the restored item gets a number. Snackbar: "‘name’
restored" with a **Show location** action.

## Delete forever

- Dialog "Delete forever?" with "‘name’ will be deleted forever. This can't
  be undone." (or "N items will be…"), **Cancel** and **Delete forever**.
- **Empty bin** shows "Empty bin?" with "All items in the bin will be deleted
  forever. This can't be undone."

## Automatic clean-up

When the app starts, it deletes bin entries binned more than 30 days ago.

## Without private access

If the session can't write `/priv/pubky-drive/`, the bin isn't available:
the Bin item is disabled, and **Move to bin** is replaced by **Delete
forever** with the confirmation dialog.
