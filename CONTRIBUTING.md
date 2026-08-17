# Contributing

Thanks for considering a contribution. Bug reports, feature requests and pull requests are
all welcome.

## Getting set up

```bash
git clone https://github.com/ahseyg/special-callouts
cd special-callouts
npm install
npm run dev     # esbuild watch
```

To try your build in Obsidian, point it at a test vault:

```
<vault>/.obsidian/plugins/special-callouts/
├── main.js
├── manifest.json
└── styles.css
```

Copy those three files across after a build, then reload Obsidian (`Ctrl+P` → "Reload app
without saving"). `npm run build` produces the production bundle.

## Project structure

```
main.ts                     plugin class, commands, post-processor registration
src/parser.ts               metadata extraction and parameter parsing
src/processor.ts            all DOM mutation, observers, retries
src/settings/SettingsTab.ts settings UI and the Visual Layout Builder
src/modals/                 suggester, icon picker, advanced builder
src/constants.ts            palettes, default styles, font tables
styles.css                  every visual rule
skills/special-callouts/    agent skill — the most complete reference to how this works
```

If you are trying to understand the rendering behaviour, read
[`skills/special-callouts/references/internals.md`](skills/special-callouts/references/internals.md).
It documents the processing pipeline, the DOM/CSS contract and the known bugs, and it is
derived from the source rather than from the docs.

## The one hard rule about styling

Never write to `element.style` directly. Obsidian's plugin review rejects it, and v1.0.6
was spent removing the last of it.

Instead, set a data attribute plus CSS custom properties from TypeScript, and put the actual
declaration in `styles.css`:

```ts
calloutEl.setCssProps({ '--sc-radius': value + 'px' });
calloutEl.setAttribute('data-sc-radius', '');
```

```css
.callout[data-sc-radius] { border-radius: var(--sc-radius); }
```

All `!important` overrides live in `styles.css` only.

## Pull requests

1. Fork, then branch from `main`.
2. Keep the change focused — one concern per PR is much easier to review.
3. Match the surrounding code: same naming, same comment density, no reformatting of
   untouched lines.
4. Run `npm run build` and confirm the plugin still loads in a real vault.
5. Describe what you changed and why. A before/after screenshot helps a lot for anything
   visual.

New metadata parameters should also be documented in `USAGE_GUIDE.md` and in
`skills/special-callouts/references/parameters.md`, otherwise the reference drifts out of
sync with the code.

## Reporting bugs

[Open an issue](https://github.com/ahseyg/special-callouts/issues) with:

1. Your Obsidian version and the plugin version
2. The exact callout markdown that misbehaves
3. A screenshot if the problem is visual
4. Whether it happens in Reading mode, Live Preview, or both

Worth checking first: `bg:` is applied at 15% opacity by design, and in a grid the position
number in `(2:3)` does nothing — only the column count matters. Both are documented in the
skill's reference files and are the two most commonly reported non-bugs.

## Releases

Maintainer only. Bump `manifest.json`, `versions.json`, `package.json` and add a
`CHANGELOG.md` section, then push a tag matching the version number — the release workflow
builds, attests and publishes from there.
