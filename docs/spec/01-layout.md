# 01 Layout (P1)

Measurements are for a 1440 × 900 window.

## Window structure

| Region       | Position                                     | Size                                             | Content                                       |
| ------------ | -------------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Header       | Top                                          | 64px high                                        | Logo and name, search field, account button   |
| Sidebar      | Left, below the header                       | 256px wide                                       | New button, navigation, access summary        |
| Content card | Right of the sidebar                         | Rest of the window, 16px margin right and bottom | Title row, filter or selection bar, item list |
| Details pane | Inside the window, right of the content card | 336px wide                                       | Details of the selected item (see 08)         |

- The window background is a light, slightly blue-grey surface. The content
  card is white with 16px rounded corners. Only the card's list scrolls.
- Below 900px width the sidebar collapses behind a menu button in the header.
  Below 600px the Owner and Size columns are hidden.

## Header

- **Logo and name** "Pubky Drive" at the left, in the sidebar column. Clicking
  it opens My Drive.
- **Search field** starting above the content card, up to 720px wide, 48px
  high, fully rounded, filled with the surface colour one step darker. A search
  icon sits on the left and a clear button (×) appears on the right when the
  field has text. See 10.
- **Account button** at the right: a round 32px avatar generated from the
  public key. It opens a menu with the shortened public key (copyable), the
  access mode, and **Sign out**.

## Sidebar

- **New** button: 56px high, 16px rounded corners, white with a shadow, a plus
  icon and the label "New". It opens the New menu (see 04).
- Navigation items, each 32px high with a 16px icon and a 14px label. The
  current view has a fully rounded light blue background and bold label:
  - My Drive (with Public and Private underneath, indented)
  - Recent
  - Starred
  - Bin
- **Access summary** at the bottom: "Drive folder" or "Entire homeserver",
  and a short line on what that means.

## Visual language

- **Type:** the system UI font stack. Body 14px/20px; page titles 22px;
  dialog titles 22px; small labels 12px.
- **Colours:** text near-black (`#1f1f1f`), secondary text grey (`#444746`),
  accent blue (`#0b57d0`), selection and active-navigation light blue
  (`#c2e7ff`), row hover very light grey (`#f1f3f4`), dividers `#e1e3e1`.
- **Icons:** outlined 20px icons from Lucide. File types get a coloured icon:
  folder dark grey, image red, PDF red, video red, audio orange, text and code
  blue, archive grey, other files grey.
- **Buttons:** filled accent buttons for the main dialog action, text buttons
  for Cancel, outlined pill buttons for secondary actions, round 40px icon
  buttons for toolbar actions with a light grey hover circle.
- **Focus:** a 2px accent outline on every focusable control.
- **Notifications:** a dark snackbar (`#303030`, white text) docks at the
  bottom left. It has an optional action (Undo) and a close button, and hides
  after 6 seconds.
