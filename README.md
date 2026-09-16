# Craig Ramos portfolio

This is a static GitHub Pages portfolio. It requires Node 24.

## Local commands

```sh
npm ci
npm run assets
npm test
npm run build
npm run preview
npm run check
```

`npm run build` creates the allowlisted `dist/` output and audits it. `npm run preview` serves that output locally. `npm run check` is the CI gate: source tests, production build/audit, and browser tests.

## Deployment ownership and safety

The root site is owned by this repository's `main:/` GitHub Pages configuration. PythOS documentation is independently owned by `craigCODA/pythos main:/docs`.

Do not create a root `pythos/` directory, change `.well-known/assetlinks.json`, add an SPA fallback, or register a root service worker. Those boundaries keep the root portfolio distinct from the separately deployed PythOS documentation and preserve Android link ownership.

Evidence assets are public-safe optimized derivatives recorded in `assets/evidence/provenance.json`. Add or change evidence only through the provenance and asset process, then run the complete production audit.

Before release, check `/`, `/pythos/` (the independent external documentation), `.well-known/assetlinks.json`, every project route, and every external link. Then run `npm run check`; do not change Pages settings as part of this repository's validation workflow.
