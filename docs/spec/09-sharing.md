# 09 Sharing (P1)

Homeservers can't share files with specific people. Sharing means choosing
between the Public and Private areas, and copying links to public files.

## Share dialog

**Share** (selection bar, context menu, details pane) opens the dialog "Share
‘name’":

- **People with access:** you (avatar, shortened public key, "Owner").
- **General access**, a choice of:
  - **Private**: "Only you and apps you authorize can open it." (lock icon)
  - **Public**: "Anyone with the link can open it." (globe icon)
- A note: "Private isn't encrypted. Your homeserver operator can read it."
- **Copy link** (only for public items) and **Done**.

Changing General access moves the item to the same path in the other area,
after confirmation:

- To public: "Make ‘name’ public? Anyone with the link can open it, and
  copies can't be recalled later."
- To private: "Make ‘name’ private? People who already downloaded it keep
  their copies."

If the same path is taken in the other area, the moved item gets a number.

## Links

- **Copy link** copies the viewer link,
  `<app address>#/view/pubky<public-key>/pub/<path>`. Snackbar: "Link copied".
- For private items, Copy link is disabled with the tooltip "Make it public to
  get a link".
- The share dialog also shows the **Pubky address**
  (`pubky<public-key>/pub/<path>`) with a copy button, for other Pubky apps.

## Public viewer

`#/view/<pubky address>` works without signing in:

- A header with "Pubky Drive" and **Sign in**.
- For a file: its name, type and size, the preview (as in 08), and **Download**.
- For a folder (address ending with `/`): a read-only list of its items, where
  folders open inside the viewer and files open the preview.
- If the file doesn't exist or isn't public: "This file isn't available. It
  may have been moved, deleted or made private."
