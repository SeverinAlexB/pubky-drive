# 11 Sign-in (P1)

## Sign-in page

Shown when no session is saved:

- The Pubky Drive name and one sentence: "Your files, on your homeserver."
- **What Pubky Drive can access**, a choice of two cards:
  - **Drive folder** (default): "Only files that Pubky Drive stores. Other
    apps' data stays untouched."
  - **Entire homeserver**: "Browse and change every file in your public and
    private storage, including other apps' data. Changing it can break those
    apps."
- **Sign in with Pubky Ring**: a QR code, an "Authorize with Pubky Ring" link
  for the same device, and **Copy link**. Changing the access choice creates a
  new authorization link.
- When the link expires: "Link expired" and **New link**.
- In local development on testnet, a **New identity** panel creates a test
  account in one step (as in the basic Pubky app template).

## After approval

- The session is saved in the browser, so it survives reloads and is shared
  across tabs.
- If Pubky Ring approved fewer capabilities than requested, the app shows a
  one-time notice listing what's unavailable.

## Account menu

The avatar button opens: the shortened public key with a copy button, the
access mode, and **Sign out**. Signing out ends the session in every tab.
