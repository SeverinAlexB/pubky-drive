# 11 Sign-in and access (P1)

## Sign-in page

Shown when no session is saved:

- The Pubky Drive name and one sentence: "Your files, on your homeserver."
- **Sign in with Pubky Ring**, with a note that Pubky Drive asks only for its
  own folder (`/pub/pubky-drive/`, `/priv/pubky-drive/`) and that access to
  the rest of the homeserver can be given later in the Homeserver section.
- A QR code, an "Authorize with Pubky Ring" link for the same device, **Copy
  link** and **Refresh link**.
- When the link expires: "Link expired" and **New link**.
- In local development on testnet, a **New identity** panel creates a test
  account in one step. Until the page reloads, that identity can also approve
  access requests ("Approve with development identity").

## After approval

- The session is saved in the browser, so it survives reloads and is shared
  across tabs.
- If Pubky Ring approved fewer capabilities than requested, the app shows a
  one-time notice listing what's unavailable.

## Access dialog

Opened from the Homeserver section, the View only note's **Allow changes**, or
**Change access…** in the account menu. Title: "What Pubky Drive can access".

1. A choice of three cards, the current one marked "(current)":
   - **Drive folder only**: "Pubky Drive sees only its own files. Other apps'
     data stays untouched."
   - **View all files**: "Browse, preview and download every file on your
     homeserver, without changing anything outside Pubky Drive."
   - **Manage all files**: "Also rename, move and delete any file, including
     other apps' data. Changing that data can break those apps."
2. **Continue with Pubky Ring** (disabled for the current level) shows the
   authorization QR code and link for the chosen level, and a **Back** button.
3. After approval the app switches to the new session and shows "Access
   changed: <level>", or "Pubky Ring approved less access than requested."
   A session of a different identity is refused with an explanation.

## Account menu

The avatar button opens: the shortened public key with a copy button, the
current access level, **Change access…**, and **Sign out**. Signing out ends
the session in every tab.
