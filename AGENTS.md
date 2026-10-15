# Repository instructions

Pubky Drive is a browser file explorer for a Pubky Homeserver, modelled on Google Drive. Read
[docs/design.md](docs/design.md) before changing storage behaviour, and the numbered documents in
[docs/spec/](docs/spec/README.md) before changing the interface.

- Keep the clean-room rule: describe observed behaviour in `docs/`, and don't copy Google code,
  styles, fonts, icons or other assets.
- Keep plain paths inside the app. Convert at the SDK boundary as `docs/design.md` describes in
  "Path encoding"; `src/drive/paths.ts` holds the conversions.
- Run `npm run check`, `npm test` and `npm run build` before handing off. Run `npm run e2e` when a
  local testnet is available.

For Pubky SDK upgrades or SDK Dependabot PRs, follow
[the pubky-sdk-upgrade skill](.agents/skills/pubky-sdk-upgrade/SKILL.md) for the research and
review steps. It was written for the app templates this repository started from; apply its
product boundaries to Pubky Drive instead.
