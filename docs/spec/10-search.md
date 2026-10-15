# 10 Search (P1)

## Search field

- `/` focuses the field. Esc clears it, then leaves it.
- While typing, after a 200ms pause, a suggestion list opens below the field
  (same width, white, 16px rounded bottom corners): up to 6 matching items
  with icon, name and location. Arrow keys move through suggestions; Enter
  opens the highlighted item: a folder opens, and a file opens the folder that
  contains it.
- Enter without a highlighted suggestion opens the results page.

## Matching

An item matches when its name contains the query, ignoring case and accents.
Search covers both areas you can access, including folders. Hidden files
(`.keep`) and the app's own data are excluded.

The first search after loading lists every folder, so it can take a moment
with many files; the field shows a spinner meanwhile. Later searches reuse the
listing until a change is made.

## Results page

- Title "Search results", and the list with the columns Name, Location,
  Date modified, File size.
- The Type filter chip works as in 03.
- No results: "No results for ‘query’".
