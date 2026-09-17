# Craig Ramos portfolio

This is a static GitHub Pages portfolio. It requires Node 24.

## Local commands

```sh
npm ci
npm run assets
npm test
npm run build
npm run audit:source
npm run preview
npm run check
```

`npm run build` creates the allowlisted `dist/` output and audits it. `npm run audit:source` classifies and scans every Git-tracked or prospective non-ignored file that the legacy root Pages source could publish. `npm run preview` serves the curated build locally. `npm run check` is the CI gate: the complete legacy Pages source audit, source tests, production build/audit, and browser tests.

## Deployment ownership and safety

The root site is owned by this repository's `main:/` GitHub Pages configuration. PythOS documentation is independently owned by `craigCODA/pythos main:/docs`.

Do not create a root `pythos/` directory, change `.well-known/assetlinks.json`, add an SPA fallback, or register a root service worker. Those boundaries keep the root portfolio distinct from the separately deployed PythOS documentation and preserve Android link ownership.

Evidence assets are public-safe optimized derivatives recorded in `assets/evidence/provenance.json`. Add or change evidence only through the provenance and asset process, then run the complete production audit.

Before release, check `/`, `/pythos/` (the independent external documentation), `.well-known/assetlinks.json`, every project route, and every external link. Then run `npm run check`; do not change Pages settings as part of this repository's validation workflow.

## Owner deployment handoff

Local acceptance stops before publication. The `Site quality` workflow verifies the branch but does not deploy it. Publication requires an owner-approved merge to `main`; keep this repository's legacy Pages source at `main:/` and keep `craigCODA/pythos` at its independent legacy `main:/docs` source.

After the approved merge and the root legacy Pages build reaches `built`, verify all six portfolio routes plus the independently owned PythOS path:

```powershell
gh api repos/craigCODA/craigcoda.github.io/pages --jq '{status,build_type,source,html_url}'
gh api repos/craigCODA/pythos/pages --jq '{status,build_type,source,html_url}'
curl.exe -I https://craigcoda.github.io/
curl.exe -I https://craigcoda.github.io/projects/ppk076/
curl.exe -I https://craigcoda.github.io/projects/warehouse-optimization/
curl.exe -I https://craigcoda.github.io/projects/skill-evaluation-lab/
curl.exe -I https://craigcoda.github.io/projects/workspace-environment-vnext/
curl.exe -I https://craigcoda.github.io/projects/pythos/
curl.exe -I https://craigcoda.github.io/pythos/
curl.exe -sS https://craigcoda.github.io/.well-known/assetlinks.json
```

Then point Playwright's base URL at `https://craigcoda.github.io` and rerun navigation, keyboard, reduced-motion, mobile, failed-request, and external-link checks. Do not call the release complete until both the live portfolio root and the independent `/pythos/` documentation pass.
