# Repository instructions

Pubky Drive is a browser file explorer for a Pubky Homeserver. Read
[docs/design.md](docs/design.md) before changing storage behaviour, and the numbered documents in
[docs/spec/](docs/spec/README.md) before changing the interface.

- Keep it an original work: don't copy code, styles, colours, fonts, icons, interface texts or
  other assets from other products, and don't name or compare to other products in the code or
  docs. The specification in `docs/spec/` is the only reference for behaviour.
- Keep plain paths inside the app. Convert at the SDK boundary as `docs/design.md` describes in
  "Path encoding"; `src/drive/paths.ts` holds the conversions.
- Run `npm run check`, `npm test` and `npm run build` before handing off. Run `npm run e2e` when a
  local testnet is available.

For Pubky SDK upgrades or SDK Dependabot PRs, follow
[the pubky-sdk-upgrade skill](.agents/skills/pubky-sdk-upgrade/SKILL.md) for the research and
review steps. It was written for the app templates this repository started from; apply its
product boundaries to Pubky Drive instead.
