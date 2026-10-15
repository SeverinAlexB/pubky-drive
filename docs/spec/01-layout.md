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
  it opens Pubky Drive.
- **Search field** starting above the content card, up to 720px wide, 48px
  high, fully rounded, filled with the surface colour one step darker. A search
  icon sits on the left and a clear button (×) appears on the right when the
  field has text. See 10.
- **Account button** at the right: a round 32px avatar generated from the
  public key. It opens a menu with the shortened public key (copyable), the
  current access level, **Change access…** (see 11), and **Sign out**.

## Sidebar

- **New** button: 56px high, 12px rounded corners, white with a shadow, a plus
  icon and the label "New". It opens the New menu (see 04).
- Navigation items, each 32px high with a 16px icon and a 14px label and 8px
  rounded corners. The current view has a pale teal background, a 3px accent
  bar on its left edge and a bold label:
  - Pubky Drive (with Public and Private underneath, indented)
  - Recent
  - Starred
  - Bin
- A divider, then **Homeserver** (server icon) with a grey hint at the right:
  "No access" or "View only". With access, `/pub` and `/priv` appear
  underneath, indented.

## Visual language

- **Type:** the system UI font stack. Body 14px/20px; page titles 22px;
  dialog titles 22px; small labels 12px.
- **Colours** (tokens in `src/styles/global.css`): neutral grey page
  background (`#f3f4f6`) with white cards, text near-black (`#1b1d21`),
  secondary text grey (`#4a4f57`), accent teal (`#0f766e`), selection and
  active navigation pale teal (`#e8f5f3`) with an accent edge, row hover
  `#eceef1`, dividers `#e2e4e8`.
- **Icons:** outlined 20px icons from Lucide. File types get a coloured icon:
  folder dark grey, image orange, PDF red, video purple, audio amber, text and
  code blue, archive stone grey, other files slate grey.
- **Shapes:** cards have 12px corners; buttons, filter chips, the search field,
  the layout toggle and the selection bar have 8px corners.
- **Buttons:** filled accent buttons for the main dialog action, text buttons
  for Cancel, outlined buttons for secondary actions, round 40px icon
  buttons for toolbar actions with a light grey hover circle.
- **Focus:** a 2px accent outline on every focusable control.
- **Notifications:** a dark snackbar (`#2a2d33`, white text) docks at the
  bottom left. It has an optional action (Undo) and a close button, and hides
  after 6 seconds.
