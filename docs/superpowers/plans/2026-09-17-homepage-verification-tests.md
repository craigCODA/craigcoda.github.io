# Homepage Verification and Test Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the rebuilt homepage, replace obsolete homepage-only contracts with tests for the rebuilt editorial design, run every repository safety and browser gate, and publish the verified `main` branch.

**Architecture:** Treat `index.html` plus `assets/css/{tokens,base,home,aperture}.css` as the approved rebuilt homepage and preserve every case-study, audit, protected file, route registry, and deployment boundary. Update only homepage-focused test expectations: keep the six-state aperture controller and accessibility boundary, validate raw evidence and live HTML compositions, and assert the new five-project editorial structure. Release only after the complete `npm run check` gate and live root/PythOS ownership checks succeed.

**Tech Stack:** Static HTML/CSS/ES modules, Node.js 24 test runner, Playwright 1.63, GitHub Pages, Git/GitHub CLI.

**Spec:** `README.md`; rebuilt homepage files in the working tree; existing design history in `docs/superpowers/plans/2026-09-16-portfolio-site.md`.

## Global Constraints

- Preserve all five case-study documents and their project-specific styles, evidence, and links.
- Do not modify `.well-known/assetlinks.json`, `.nojekyll`, or `404.html`; their approved hashes must continue to pass `test/protected-files.test.mjs`.
- Do not create a root `pythos/` directory, SPA fallback, or root-scoped service worker.
- Keep the root GitHub Pages source at `craigCODA/craigcoda.github.io main:/` and the independent PythOS source at `craigCODA/pythos main:/docs`.
- Preserve all public-output and source-surface audit tests; no safety assertion may be weakened or removed.
- Publish only after `npm run check` exits with zero failures.

---

### Task 1: Capture the rebuilt homepage baseline

**Files:**
- Verify: `index.html`
- Verify: `assets/css/tokens.css`
- Verify: `assets/css/base.css`
- Verify: `assets/css/home.css`
- Verify: `assets/css/aperture.css`

**Interfaces:**
- Consumes: the rebuilt working tree and `npm run build` production output.
- Produces: desktop/mobile screenshots and browser evidence used to define current homepage contracts.

- [ ] **Step 1: Build the curated public output**

Run: `npm run build`

Expected: `Built 6 routes, 129 assets` and exit code 0.

- [ ] **Step 2: Preview the production output**

Run: `npm run preview`

Expected: the server listens at `http://127.0.0.1:4173`.

- [ ] **Step 3: Verify desktop and mobile renders**

Use Playwright Chromium at 1440×1000 and 390×844 to load `/`, scroll through the complete page, capture full-page screenshots, and inspect console errors, page errors, HTTP responses, framework overlays, horizontal overflow, and lazy evidence loading.

Expected: meaningful content, no console/page/HTTP errors, no overlay, no horizontal overflow, and the five selected projects plus closing sections render coherently.

- [ ] **Step 4: Verify homepage navigation**

Click the first `Open case study` link.

Expected: navigation reaches `/projects/ppk076/`, the page title is `PPK076 — Spatial Evidence Case Study — Craig Ramos`, and exactly one `main` landmark exists.

### Task 2: Refresh the aperture static contract

**Files:**
- Modify: `test/aperture-static-boundary.test.mjs`
- Test: `test/aperture-static-boundary.test.mjs`

**Interfaces:**
- Consumes: six `data-aperture-frame` articles, their duration vector, `assets/evidence/provenance.json`, and the unchanged aperture controller/adapter.
- Produces: `assertEvidenceShape(figureBody, provenance)`, which returns exact registered original paths for filesystem validation.

- [ ] **Step 1: Replace the obsolete visible-copy expectation**

Define each frame as three ordered paragraphs: the numbered project label, statement, and support line. Keep the six-entry assistive transcript free of the visual number labels.

- [ ] **Step 2: Replace responsive-picture assumptions with the rebuilt raw-evidence contract**

Assert five aperture images: three live original PPK076 images in frame one, then deferred original Workspace and PythOS images. For every image, require a provenance-registered original path, exact alt text and intrinsic dimensions, asynchronous decoding, and the intended eager/lazy delivery mode. Assert that the aperture does not introduce `picture`, `source`, `srcset`, or `data-srcset` markup.

- [ ] **Step 3: Update scoped disclosure mutations**

Keep Skill Evaluation Lab claims tied to preserved failures and narrowed reproduced effects. Keep Workspace copy explicit about the placeholder and reject completed-streaming claims.

- [ ] **Step 4: Update negative evidence mutations**

Mutate an original path to an unregistered asset, blank the first alt, change registered dimensions, break eager/lazy delivery, change decoding, and add responsive markup. Each mutation must fail the matching assertion; attribute reordering must still pass.

- [ ] **Step 5: Run the focused aperture test**

Run: `node --test test/aperture-static-boundary.test.mjs`

Expected: 2 tests pass, 0 fail.

### Task 3: Refresh rebuilt-homepage semantic contracts

**Files:**
- Modify: `test/semantics.test.mjs`
- Preserve/Add: `test/home-composition.test.mjs`
- Test: `test/semantics.test.mjs`
- Test: `test/home-composition.test.mjs`

**Interfaces:**
- Consumes: homepage section IDs, project modifier classes, exact registered original evidence, public destination registry, and the rebuilt CSS selectors.
- Produces: focused tests for the editorial narrative, five distinct project compositions, responsive touch targets, section rhythm, live proof compositions, and exact evidence provenance.

- [ ] **Step 1: Update narrative landmarks and post-aperture progression**

Assert the order `opening → aperture → thesis → work → verified-work → background → contact`, including the rebuilt thesis heading, selected-work heading, verified-work credential boundary, background statement, and closing line.

- [ ] **Step 2: Update aperture semantic expectations**

Keep six ordered frames and durations. Expect registered originals only in frames 1, 4, and 5; assert the warehouse result and agent ledger are live HTML compositions and synthesis remains decorative.

- [ ] **Step 3: Update homepage evidence contracts**

Expect 10 homepage images total and five selected-work images: three PPK076 originals, one Workspace original, and one PythOS original. Validate exact provenance alt text, dimensions, loading, and decoding without requiring `picture` wrappers on the rebuilt homepage; retain the existing responsive-picture contract for all case-study pages.

- [ ] **Step 4: Update layout and interaction contracts**

Assert the rebuilt `.project-link` and `.closing-links a` 44-pixel mobile targets, the rebuilt section padding/rhythm, five semantic `.project` articles, the `.warehouse-proof` and `.run-ledger--project` live proof blocks, and each project modifier's distinct CSS composition.

- [ ] **Step 5: Update fixture mutations**

Make each mutation target markup that exists in the rebuilt homepage: duplicate a project modifier, remove a registered work image, corrupt intrinsic dimensions/alt text, remove live proof blocks, or introduce prohibited generic card styling. Confirm every mutation fails its intended contract.

- [ ] **Step 6: Run focused homepage tests**

Run: `node --test test/aperture-static-boundary.test.mjs test/home-composition.test.mjs test/semantics.test.mjs`

Expected: all focused tests pass with zero failures.

### Task 4: Run the complete release gate and audit preservation boundaries

**Files:**
- Verify: `.well-known/assetlinks.json`
- Verify: `.nojekyll`
- Verify: `404.html`
- Verify: `projects/**`
- Verify: `scripts/audit-*.mjs`
- Verify: `test/**`

**Interfaces:**
- Consumes: all authored source, route registry, public-output allowlist, browser specs, and rebuilt tests.
- Produces: fresh zero-failure evidence for the exact commit to publish.

- [ ] **Step 1: Run the complete repository gate**

Run: `npm run check`

Expected: source audit passes, all Node tests pass, the six-route build/public audit passes, and all Playwright browser projects pass with zero failures.

- [ ] **Step 2: Recheck protected/deployment boundaries explicitly**

Run: `node --test test/protected-files.test.mjs test/routes.test.mjs test/pages-source-surface.test.mjs`

Expected: approved hashes pass, the root `pythos/` route/directory remains absent, and the complete prospective Git inventory passes the source-surface audit.

- [ ] **Step 3: Review the final diff**

Run: `git status --short`, `git diff --check`, `git diff --stat`, and inspect every changed path.

Expected: only the approved rebuilt homepage/CSS, homepage-focused tests, and this plan are changed; no case study, protected file, audit implementation, or deployment workflow is modified.

### Task 5: Commit, push, and verify publication ownership

**Files:**
- Commit: the verified final diff on `main`.

**Interfaces:**
- Consumes: the exact tree that passed Task 4.
- Produces: a pushed `origin/main` commit and live deployment evidence for the root portfolio and independent PythOS site.

- [ ] **Step 1: Commit the verified tree**

Run: `git add` with the reviewed changed paths, then `git commit -m "test: align homepage checks with rebuilt design"`.

Expected: one `main` commit containing no generated `dist/`, browser report, or test-result artifacts.

- [ ] **Step 2: Push main**

Run: `git push origin main`.

Expected: `origin/main` advances to the verified commit without force-push.

- [ ] **Step 3: Confirm Pages ownership**

Run:

```powershell
gh api repos/craigCODA/craigcoda.github.io/pages --jq '{status,build_type,source,html_url}'
gh api repos/craigCODA/pythos/pages --jq '{status,build_type,source,html_url}'
```

Expected: root portfolio remains `main:/`; PythOS remains `main:/docs` in the independent repository.

- [ ] **Step 4: Verify live routes after the Pages build reaches `built`**

Run HEAD checks for `/`, all five `/projects/.../` routes, and `/pythos/`; fetch `/.well-known/assetlinks.json`; then rerun the existing Playwright navigation/accessibility checks against the live base URL.

Expected: every route returns success, protected Asset Links bytes remain approved, the rebuilt root is live, and the independent `/pythos/` documentation remains reachable.
