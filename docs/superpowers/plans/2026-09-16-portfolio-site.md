# Craig Ramos Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved cinematic, evidence-led Craig Ramos portfolio at `https://craigcoda.github.io/` while preserving the existing Digital Asset Links file and the independently published PythOS documentation at `https://craigcoda.github.io/pythos/`.

**Architecture:** Keep the root site as a progressively enhanced static multi-page site published by the repository's existing GitHub Pages source (`main`, repository root). Author semantic HTML directly, split visual rules into focused CSS files, and limit client JavaScript to the one-shot aperture controller. Keep `/pythos/` owned by the separate `craigCODA/pythos` Pages project; never create a top-level `pythos/` directory or a root-scoped service worker in this repository.

**Tech Stack:** HTML5, CSS custom properties and media/container queries, browser ES modules, IntersectionObserver, `matchMedia`, Node.js 24 built-in test runner and build scripts, Sharp 0.35.4 for build-time responsive image generation, Playwright Test 1.63.0 for browser verification, legacy GitHub Pages branch deployment from `main:/`.

**Spec:** `D:\craig-portfolio-assets-v0.2\PORTFOLIO-DESIGN-HANDOFF-v0.1.md`; supporting sources: `D:\craig-portfolio-assets-v0.2\ASSET-MANIFEST.md`, `D:\craig-portfolio-assets-v0.2\generated\APERTURE-SEQUENCE-v0.1.md`, and `D:\craig-portfolio-assets-v0.2\generated\homepage-aperture-storyboard-v0.2.png`.

## Global Constraints

- Preserve the approved thesis in this order: physical systems -> operational software -> agent evidence -> spatial computing -> low-level systems.
- Implement the supplied design; do not restart brainstorming, replace the visual concept, or reinterpret the site as a generic developer portfolio.
- Visual tone: cinematic, restrained, editorial, technical, spacious, physical, human, and predominantly light.
- Avoid neon cyberpunk, generic AI gradients, hacker/terminal theming, a very dark overall site, repeated rounded-card grids, glassmorphism, decorative motion, scroll-jacking, endless carousels, and generic frontend-template styling.
- Display type uses the system `Arial Black`/heavy neutral sans direction; narrative type uses `Times New Roman`/editorial serif; utility type uses Arial/neutral sans. Do not add a webfont dependency.
- The aperture is an authored approximately 23-second sequence, runs once per page load after meaningful viewport entry, has no arrows or dots, does not loop, and does not intercept scrolling.
- Motion may only reveal structure, show causality, show persistence, or connect conceptual layers.
- `prefers-reduced-motion: reduce` receives the same six aperture states through instantaneous still/text cuts with no scale drift, fades, or masked transitions.
- Mobile preserves the conceptual aperture with simpler cuts and project-specific crops; it does not reproduce every desktop movement.
- Use only claims and evidence supported by the handoff, asset manifest, inspected public repositories, or user-supplied public links.
- Warehouse optimization copy must use exactly `176 pallet positions recovered` and `22 storage bins freed`; never publish or combine the separate deprecated historical warehouse result identified in the private design handoff.
- Do not publish the supplied excluded raw warehouse map: inspection found a site-identifying title and hundreds of internal location codes. Use the generated public-safe result visual instead.
- Do not publish source-system record exports, internal emails, personnel images, access forms, detailed warehouse records, or private NerdLife/client material.
- Treat `generated/skill-evaluation-lab-evidence-map.png` as a captured saved record, not live repository status. Its `0031` evidence-state panel must be captioned accordingly because the inspected public repository currently identifies run `0015` as its completed public run.
- Workspace copy must say that the large application screen in the saved M2A room checkpoint is a placeholder and must not imply completed live generic Windows surface streaming.
- PythOS copy must tie `313 verification markers`, `zero drops`, and `CRC 176F4C6E` to the documented target-specific physical evidence path and explicitly avoid a universal hardware-support claim.
- Keep PythOS governing architecture, verified implementation, physical evidence, and unfinished work distinct.
- The section heading is exactly `VERIFIED WORK`; never rename it to `Certificates`.
- REWORK verification supports the relevant work in context; it is not a detached badge wall.
- Project pages share the information architecture `Problem`, `What I built`, `Architecture / decisions`, `Evidence`, `Result`, `Technologies`, `Current boundary / unfinished work`, `Source / demo / verification`, but use project-specific compositions.
- Preserve `.nojekyll` as an empty file and `.well-known/assetlinks.json` byte-for-byte unless the Android app owner separately authorizes a change.
- Do not create a root service worker: a `/`-scoped worker could interfere with `/pythos/` and other GitHub Pages project sites.
- Do not change the GitHub Pages source setting from `main:/`; a deployment-architecture change is unnecessary for this static site.
- Do not modify the `craigCODA/pythos` repository or its `main:/docs` Pages configuration.
- No top-level `pythos/` directory may exist in this repository. The portfolio's PythOS case study lives at `/projects/pythos/`.
- Direct navigation and refresh must work through real directory `index.html` files; do not implement SPA rewrite routing.
- Accessibility and performance are acceptance criteria in each task, not a final cleanup pass.
- Use test-driven development for behavior and validation utilities. Each implementation task starts with a failing focused test, makes the smallest change that passes it, reruns the relevant suite, and commits independently.

---

## Inspected Baseline and Deployment Facts

- Target repository: `craigCODA/craigcoda.github.io`, default branch `main`, inspected at commit `2f6b0e088700a281136cc5b2c3f423c38852b968`.
- Current tracked root content: `.nojekyll` and `.well-known/assetlinks.json` only. There is no package manifest, build system, workflow, framework, application source, `index.html`, or repository instruction file.
- Current live root response: `https://craigcoda.github.io/` returns GitHub Pages `404` because there is no root `index.html`.
- Root Pages configuration: legacy Pages build from `main`, path `/`, HTTPS enforced.
- `.well-known/assetlinks.json` is live at the root and associates `io.github.craigcoda.twa` with its current signing fingerprint. Its SHA-256 is `BFBBE4F4B583EF45CF0BFA48E0C954CA333AFD861E5FF72F5F3BAD5196624D1E`.
- `.nojekyll` is empty. Its SHA-256 is `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855`.
- `/pythos/` is not stored or generated by the root repository. It is the separate GitHub Pages project for `craigCODA/pythos`.
- PythOS Pages configuration: legacy Pages build from `craigCODA/pythos` branch `main`, path `/docs`, HTTPS enforced.
- The live `/pythos/` HTML and `craigCODA/pythos:main/docs/index.html` were byte-identical at inspection time (length `9504`, SHA-256 `5079ED9DE272CFDE4219310710AE6460E540C01CBA57DA5D82BCEBC8B287544C`).
- The PythOS repository has no Pages deployment workflow; its only inspected workflow is QEMU acceptance. This confirms that `/pythos/` remains independently owned by the separate project's branch-based Pages site.
- Adding ordinary static files to the root repository does not require copying or rebuilding PythOS. Preservation means avoiding a colliding top-level `pythos/` path, avoiding root SPA rewrites, avoiding a root-scoped service worker, and verifying both URLs after deployment.

## Proposed File Structure

```text
.
|-- .github/
|   `-- workflows/
|       `-- site-quality.yml              # Tests/build only; does not deploy or change Pages settings
|-- .nojekyll                             # Existing empty file, unchanged
|-- .well-known/
|   `-- assetlinks.json                   # Existing Android association, unchanged
|-- 404.html                              # Calm static 404; no rewrite router
|-- README.md                             # Local workflow, Pages ownership, safety notes
|-- index.html                            # Semantic homepage sections and aperture markup
|-- package.json                          # Node 24 scripts; no client framework
|-- package-lock.json                     # Exact build/test dependency lock
|-- playwright.config.mjs                 # Desktop/tablet/mobile/reduced-motion projects
|-- assets/
|   |-- css/
|   |   |-- reset.css                     # Minimal normalization
|   |   |-- tokens.css                    # Palette, typography, spacing, widths
|   |   |-- base.css                      # Shared semantic shell, links, focus, masthead/footer
|   |   |-- home.css                      # Homepage rhythm and asymmetric selected-work layouts
|   |   |-- aperture.css                  # Authored window, state transitions, mobile/reduced motion
|   |   |-- project.css                   # Shared project-page information architecture
|   |   `-- projects/
|   |       |-- ppk076.css                # Spatial/image-led case-study composition
|   |       |-- warehouse.css             # Evidence-led operational composition
|   |       |-- skill-lab.css             # Evaluation-record composition
|   |       |-- workspace.css             # Spatial/architectural composition
|   |       `-- pythos.css                # Stark technical evidence composition
|   |-- js/
|   |   |-- aperture-controller.js        # Pure one-shot timeline/state machine
|   |   `-- aperture.js                   # DOM/observer/media-query adapter
|   `-- evidence/
|       |-- provenance.json               # Every public asset mapped to manifest source and boundary
|       |-- original/                     # Selected approved inputs only; no raw warehouse SVG
|       |   |-- ppk076/
|       |   |-- warehouse/
|       |   |-- skill-evaluation/
|       |   |-- workspace/
|       |   `-- pythos/
|       `-- optimized/                    # Generated AVIF/WebP responsive derivatives
|-- docs/
|   `-- superpowers/
|       `-- plans/
|           `-- 2026-09-16-portfolio-site.md
|-- projects/
|   |-- ppk076/index.html
|   |-- warehouse-optimization/index.html
|   |-- skill-evaluation-lab/index.html
|   |-- workspace-environment-vnext/index.html
|   `-- pythos/index.html                 # Deliberately nested under /projects/
|-- scripts/
|   |-- build.mjs                         # Copies the exact deployable allowlist to dist/
|   |-- optimize-images.mjs               # Sharp-based deterministic variants
|   |-- audit-public-output.mjs            # Asset/copy/link/sensitive-claim gate
|   |-- serve.mjs                         # Dependency-free local static server
|   `-- site-files.mjs                    # One source for routes and deploy allowlist
`-- test/
    |-- aperture-controller.test.mjs
    |-- assets.test.mjs
    |-- claims.test.mjs
    |-- protected-files.test.mjs
    |-- routes.test.mjs
    |-- semantics.test.mjs
    `-- browser/
        |-- accessibility.spec.mjs
        |-- aperture.spec.mjs
        |-- navigation.spec.mjs
        `-- performance.spec.mjs
```

`dist/`, Playwright output, and generated test screenshots stay ignored. The legacy Pages site continues to publish the checked-in repository root, so every committed file must be treated as public. `npm run build` produces an independently inspectable mirror of the route and asset surface referenced by the website for deterministic tests and local preview; it is a validation artifact, not a replacement deployment mechanism.

## Confirmed Public Link Registry

Use only these inspected destinations unless the owner supplies another URL before execution:

| Purpose | URL |
|---|---|
| GitHub profile | `https://github.com/craigCODA` |
| Public contact | `mailto:mistercraigr@gmail.com` |
| LinkedIn | `https://www.linkedin.com/in/Craig-Ramos` |
| Portfolio source | `https://github.com/craigCODA/craigcoda.github.io` |
| PPK076 source | `https://github.com/craigCODA/ppk076` |
| PPK076 live demo | `https://craigcoda.github.io/ppk076/` |
| Skill Evaluation Lab source | `https://github.com/craigCODA/Skill-Evaluation-Lab` |
| Skill Evaluation evidence release | `https://github.com/craigCODA/Skill-Evaluation-Lab/releases/tag/evidence-0001-0015` |
| Workspace Environment vNext source | `https://github.com/craigCODA/workspace-environment-vnext` |
| PythOS source | `https://github.com/craigCODA/pythos` |
| PythOS documentation | `https://craigcoda.github.io/pythos/` |
| PythOS physical-storage release | `https://github.com/craigCODA/pythos/releases/tag/milestone-1-physical-storage` |

No public Warehouse Optimization source repository, demo URL, or REWORK credential URL was present in the asset pack or surfaced by inspection. The implementation must not invent one. Render the verified result and its evidence context without an external credential link unless the owner supplies an authoritative public URL before that task begins.

## Content and Disclosure Contract

| Project | Public claim | Required boundary | Primary evidence |
|---|---|---|---|
| PPK076 | Browser-based 3D warehouse simulation connecting modeled space, local operational data, training, PWA, WebXR, and desktop packaging | Describe supported local export parsing and no SAP return path; do not expose raw warehouse data | First-person forklift, full facility, top-down, rack/floor detail, matched-camera before/after, security boundary |
| Warehouse optimization | `176 pallet positions recovered`; `22 storage bins freed`; deterministic decision support with human verification authoritative | Never include the deprecated historical result pair, source-system rows, the excluded facility map, or internal location codes | `generated/warehouse-optimization-verified-result.png` only |
| Skill Evaluation Lab | Controlled original/no-skill/candidate conditions, isolated run state, preserved failures, hashes, cross-model replication, and narrowed claims | `0031` image block is a captured saved record, not current public repository status; never imply universal agent improvement | Generated evidence map plus public repository/release methodology |
| Workspace Environment vNext | Persistent semantic world, host-owned authority, trusted renderer, spatial objects, current M2A room checkpoint | Large application screen is a placeholder in this checkpoint; completed live generic Windows surface streaming is not claimed | Saved M2A room checkpoint |
| PythOS | From-scratch verification-driven x86-64 OS architecture; UEFI, native PythCore, protected ring-3 work, typed persistent objects, capability-controlled authority, recovery evidence, local package lifecycle, QEMU acceptance | `313 / zero / 176F4C6E` is target-specific physical evidence; separate architecture, verified scope, evidence, and later unfinished work | Physical terminal, architecture/evidence boundary, public evidence map, claim boundary |
| NerdLife professional work | Existing React/Node codebases, full-stack business software, Git/PR workflow, testing/builds, coding-agent SKILL development, repository-aware AI workflow, evaluation, documentation/handoff | Text only; no proprietary screenshots, client data, private code, client names, or confidential implementation details | Public-safe prose |

---

### Task 1: Isolate Execution and Protect Existing GitHub Pages Contracts

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `.gitignore`
- Create: `scripts/site-files.mjs`
- Create: `test/protected-files.test.mjs`
- Create: `test/routes.test.mjs`
- Preserve unchanged: `.nojekyll`
- Preserve unchanged: `.well-known/assetlinks.json`

**Interfaces:**
- Produces: `PROTECTED_FILE_HASHES: Readonly<Record<string, string>>`, `SITE_ROUTES: readonly string[]`, and `DEPLOY_ENTRIES: readonly string[]` from `scripts/site-files.mjs`.
- Produces: `npm test` as the fast unit/contract gate used by every later task.
- Consumes: the inspected Pages baseline and the two protected-file SHA-256 values in this plan.

- [ ] **Step 1: Create the isolated implementation workspace**

Invoke `superpowers:using-git-worktrees` before implementation. Branch from `origin/main` as `feat/portfolio-site`, keep the authoritative `main` checkout clean, and copy this approved plan into the worktree if it is not yet committed.

Run:

```powershell
git fetch origin
git status --short --branch
git rev-parse HEAD
git branch --show-current
git remote -v
```

Expected: clean baseline at `2f6b0e0...` or a clearly reviewed newer `origin/main`; implementation does not begin on `main`.

- [ ] **Step 2: Write the failing protected-file and route-contract tests**

Create `test/protected-files.test.mjs` with Node's built-in `node:test`, `assert/strict`, `createHash`, and `readFile`. Assert the exact SHA-256 values for `.nojekyll` and `.well-known/assetlinks.json`, assert `.nojekyll` length is zero, and assert the parsed Android package is `io.github.craigcoda.twa`.

Create `test/routes.test.mjs` that imports `SITE_ROUTES` and asserts this exact route set:

```js
[
  '/',
  '/projects/ppk076/',
  '/projects/warehouse-optimization/',
  '/projects/skill-evaluation-lab/',
  '/projects/workspace-environment-vnext/',
  '/projects/pythos/'
]
```

Also assert that `/pythos/` is absent from `SITE_ROUTES`, `DEPLOY_ENTRIES` contains `.nojekyll` and `.well-known`, and no top-level `pythos` directory exists.

- [ ] **Step 3: Add the minimal Node toolchain and verify the tests fail for the missing interface**

Create `package.json` with:

```json
{
  "name": "craig-ramos-portfolio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.0.0" },
  "scripts": {
    "assets": "node scripts/optimize-images.mjs",
    "test": "node --test test/*.test.mjs",
    "test:browser": "playwright test",
    "audit": "node scripts/audit-public-output.mjs dist",
    "build": "node scripts/build.mjs",
    "preview": "node scripts/serve.mjs dist --port 4173",
    "check": "npm test && npm run build && npm run test:browser"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "sharp": "0.35.4"
  }
}
```

Run `npm install`, then run `npm test`.

Expected: FAIL because `scripts/site-files.mjs` does not yet exist.

- [ ] **Step 4: Implement the protected hashes and route/deploy registries**

Create `scripts/site-files.mjs` with immutable exports:

```js
export const PROTECTED_FILE_HASHES = Object.freeze({
  '.nojekyll': 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
  '.well-known/assetlinks.json': 'BFBBE4F4B583EF45CF0BFA48E0C954CA333AFD861E5FF72F5F3BAD5196624D1E'
});

export const SITE_ROUTES = Object.freeze([
  '/',
  '/projects/ppk076/',
  '/projects/warehouse-optimization/',
  '/projects/skill-evaluation-lab/',
  '/projects/workspace-environment-vnext/',
  '/projects/pythos/'
]);

export const DEPLOY_ENTRIES = Object.freeze([
  '.nojekyll',
  '.well-known',
  '404.html',
  'assets',
  'index.html',
  'projects'
]);
```

Add `.gitignore` entries for `node_modules/`, `dist/`, `playwright-report/`, `test-results/`, and `.DS_Store`.

- [ ] **Step 5: Run the protection tests**

Run: `npm test`

Expected: protected-file tests PASS; route tests PASS even though later route-file existence assertions have not yet been added.

- [ ] **Step 6: Commit the deployment-contract foundation**

```powershell
git add .gitignore package.json package-lock.json scripts/site-files.mjs test/protected-files.test.mjs test/routes.test.mjs docs/superpowers/plans/2026-09-16-portfolio-site.md
git commit -m "chore: protect portfolio pages contracts"
```

---

### Task 2: Import, Trace, and Optimize the Approved Evidence Assets

**Files:**
- Create: `assets/evidence/provenance.json`
- Create: `assets/evidence/original/ppk076/*`
- Create: `assets/evidence/original/warehouse/warehouse-optimization-verified-result.png`
- Create: `assets/evidence/original/skill-evaluation/skill-evaluation-lab-evidence-map.png`
- Create: `assets/evidence/original/workspace/workspace-m2a-room-checkpoint.png`
- Create: `assets/evidence/original/pythos/*`
- Create: `assets/evidence/optimized/**`
- Create: `scripts/optimize-images.mjs`
- Create: `test/assets.test.mjs`

**Interfaces:**
- Produces: provenance records shaped as `{ source, original, outputStem, project, roles, disclosure, alt, kind, sourceWidth, sourceHeight, widths }`.
- Produces: deterministic files named `<stem>-<width>w.avif` and `<stem>-<width>w.webp` under `assets/evidence/optimized/<project>/`.
- Produces: a public-asset allowlist consumed by `scripts/audit-public-output.mjs` and all HTML `<picture>` elements.
- Consumes: selected files from the external v0.2 asset pack; never copies the raw warehouse SVG.

- [ ] **Step 1: Write the failing asset provenance tests**

Create `test/assets.test.mjs` to assert:

1. Every provenance `source` begins with one of `ppk076/`, `generated/`, `workspace/`, or `pythos/`.
2. Every record has non-empty `original`, `outputStem`, `project`, `roles`, `disclosure`, and `alt` fields.
3. Every `alt` explains the evidence purpose rather than repeating a filename.
4. The excluded raw warehouse map is absent from the registry and absent from the repository.
5. The registry contains exactly the 17 approved originals listed below.
6. Each requested width is less than or equal to the source width, preventing upscaling.
7. After `npm run assets`, every declared AVIF/WebP derivative exists and is non-empty.

Run: `node --test test/assets.test.mjs`

Expected: FAIL because the provenance registry and originals do not exist.

- [ ] **Step 2: Copy only the selected originals from the asset pack**

Copy these exact files, preserving their source path in `provenance.json`:

```text
ppk076/ppk076_first_person_forklift.png
ppk076/ppk076_inventory_baseline_before_import.png
ppk076/ppk076_inventory_populated_after_import.png
ppk076/ppk076_geometry_wireframe.png
ppk076/ppk076_full_facility_oblique.png
ppk076/ppk076_topdown_facility.png
ppk076/ppk076_rack_floor_bin_detail.png
ppk076/ppk076_operational_relationship.png
ppk076/ppk076_data_security_boundary.png
ppk076/ppk076_multisite_build_method.png
generated/warehouse-optimization-verified-result.png
generated/skill-evaluation-lab-evidence-map.png
workspace/workspace_m2a_room_checkpoint.png
pythos/pythos_physical_evidence_terminal.jpg
pythos/pythos_public_evidence_map.jpg
pythos/pythos_claim_boundary.jpg
generated/pythos-architecture-evidence-boundary.png
```

Use the canonical project folders rather than the duplicate `incoming/` copies. Do not copy either storyboard or the excluded raw warehouse map into the public site.

- [ ] **Step 3: Write the complete provenance registry**

Populate `assets/evidence/provenance.json` with one entry per file. Use these exact roles, alt strategies, kinds, and responsive widths:

| Source | Roles | Alt text | Kind | Widths |
|---|---|---|---|---|
| `ppk076/ppk076_first_person_forklift.png` | aperture, PPK hero | `First-person view inside the modeled Plant 076 production floor with a forklift, pallet load, safety rails, and equipment` | scene | 640, 1080, 1757 |
| `ppk076/ppk076_inventory_baseline_before_import.png` | aperture transition, PPK evidence | `Matched warehouse camera before local inventory data is visualized, showing the modeled storage structure largely unpopulated` | scene | 640, 1080, 1758 |
| `ppk076/ppk076_inventory_populated_after_import.png` | aperture transition, PPK evidence | `Same warehouse camera after supported local inventory data is visualized as pallet loads throughout the modeled facility` | scene | 640, 1080, 1759 |
| `ppk076/ppk076_geometry_wireframe.png` | PPK architecture | `Wireframe fragment showing physical warehouse geometry translated into a software model` | diagram | 640, 1000, 1600 |
| `ppk076/ppk076_full_facility_oblique.png` | PPK project hero | `Oblique overview of the modeled production and warehouse facility` | scene | 640, 1080, 1759 |
| `ppk076/ppk076_topdown_facility.png` | PPK spatial evidence | `Top-down view showing relationships among modeled warehouse regions` | scene | 640, 1080, 1759 |
| `ppk076/ppk076_rack_floor_bin_detail.png` | PPK operational evidence | `Modeled storage detail distinguishing rack positions from floor-bin areas` | scene | 640, 1080, 1759 |
| `ppk076/ppk076_operational_relationship.png` | PPK operational evidence | `Modeled production staging, forklift, and trainee marker showing an operational relationship in space` | scene | 640, 1080, 1759 |
| `ppk076/ppk076_data_security_boundary.png` | PPK architecture | `Diagram of the manual export and local parsing boundary with no return path into SAP` | diagram | 640, 1000, 1600 |
| `ppk076/ppk076_multisite_build_method.png` | PPK architecture | `Diagram summarizing the method used to build reusable modeled facility structure` | diagram | 640, 1000, 1600 |
| `generated/warehouse-optimization-verified-result.png` | aperture, warehouse hero, verified work | `Public-safe abstract grid beside the verified result: 176 pallet positions recovered and 22 storage bins freed` | diagram | 720, 1200, 1800 |
| `generated/skill-evaluation-lab-evidence-map.png` | aperture, skill-lab hero | `Evidence map showing control, isolation, comparison, replication, and hash verification, with a captured saved-record status block` | diagram | 720, 1280, 1920 |
| `workspace/workspace_m2a_room_checkpoint.png` | aperture, workspace hero | `Saved M2A room checkpoint with a spatial screen placeholder, table, brick objects, object panel, trusted controls, and connected state` | scene | 640, 1080, 1760 |
| `pythos/pythos_physical_evidence_terminal.jpg` | aperture, PythOS hero, verified work | `PythOS evidence terminal running on a physical laptop, with enough screen bezel visible to establish the hardware context` | photo | 640, 1024, 1536 |
| `pythos/pythos_public_evidence_map.jpg` | PythOS evidence | `Public PythOS milestone and evidence map shown as a tall document view` | document | 460, 691 |
| `pythos/pythos_claim_boundary.jpg` | PythOS boundary | `PythOS claim-boundary document separating verified work from unfinished scope` | document | 460, 691 |
| `generated/pythos-architecture-evidence-boundary.png` | aperture support, PythOS architecture | `Architecture and evidence diagram separating governing design, Phase 13 verification, target-specific physical evidence, and later work` | diagram | 720, 1280, 1920 |

Set `disclosure` to `public-safe selected evidence` for the supplied authentic assets, `public-safe generated abstraction` for Warehouse and Skill Evaluation, and `target-specific public evidence with explicit scope boundary` for PythOS evidence.

For every record, set `sourceWidth` and `sourceHeight` to the inspected dimensions. Set `original` to the copied file under `assets/evidence/original/<project>/` with its source basename, and set `outputStem` to the same basename without its extension under `assets/evidence/optimized/<project>/`. Use project directory names `ppk076`, `warehouse`, `skill-evaluation`, `workspace`, and `pythos`; this makes every input and output path explicit in the registry rather than inferred by the optimizer.

- [ ] **Step 4: Implement deterministic responsive image generation**

Create `scripts/optimize-images.mjs`. It must:

1. Read `assets/evidence/provenance.json`.
2. Resolve every input and output under the repository root and reject traversal.
3. Refuse to upscale.
4. For `scene`/`photo`, emit AVIF at quality 52 and WebP at quality 78.
5. For `diagram`/`document`, emit AVIF at quality 65 and WebP at quality 90 so small text remains legible.
6. Preserve orientation, strip metadata, and write all declared widths.
7. Fail if a source is absent or an output is zero bytes.

The processing loop should use this interface:

```js
async function buildVariants({ inputPath, outputStem, widths, kind }) {
  const metadata = await sharp(inputPath).metadata();
  for (const width of widths) {
    if (width > metadata.width) throw new Error(`Refusing to upscale ${inputPath}`);
    const pipeline = sharp(inputPath).rotate().resize({ width, withoutEnlargement: true });
    await pipeline.clone().avif({ quality: kind === 'diagram' || kind === 'document' ? 65 : 52 })
      .toFile(`${outputStem}-${width}w.avif`);
    await pipeline.clone().webp({ quality: kind === 'diagram' || kind === 'document' ? 90 : 78 })
      .toFile(`${outputStem}-${width}w.webp`);
  }
}
```

- [ ] **Step 5: Generate assets and enforce budgets**

Run:

```powershell
npm run assets
node --test test/assets.test.mjs
```

Extend the test so the largest optimized aperture source at 1920/1800/1760/1759 pixels is at most 450 KB and every mobile source at 640/720 pixels is at most 180 KB. If a text-heavy diagram misses the size target, prefer legibility and document the exact exception in the provenance record rather than lowering quality until text blurs.

Expected: all asset tests PASS; no excluded SVG or unregistered evidence asset is present.

Every later HTML use of evidence follows one responsive `<picture>` contract: AVIF sources first, WebP sources second, and the traced original as fallback. For example:

```html
<picture>
  <source type="image/avif" srcset="/assets/evidence/optimized/ppk076/ppk076_first_person_forklift-640w.avif 640w, /assets/evidence/optimized/ppk076/ppk076_first_person_forklift-1080w.avif 1080w, /assets/evidence/optimized/ppk076/ppk076_first_person_forklift-1757w.avif 1757w">
  <source type="image/webp" srcset="/assets/evidence/optimized/ppk076/ppk076_first_person_forklift-640w.webp 640w, /assets/evidence/optimized/ppk076/ppk076_first_person_forklift-1080w.webp 1080w, /assets/evidence/optimized/ppk076/ppk076_first_person_forklift-1757w.webp 1757w">
  <img src="/assets/evidence/original/ppk076/ppk076_first_person_forklift.png" width="1757" height="915" alt="First-person view inside the modeled Plant 076 production floor with a forklift, pallet load, safety rails, and equipment" decoding="async">
</picture>
```

- [ ] **Step 6: Commit the evidence pipeline**

```powershell
git add assets/evidence scripts/optimize-images.mjs test/assets.test.mjs
git commit -m "feat: add traced portfolio evidence assets"
```

---

### Task 3: Build the Semantic Site Shell and Editorial Visual Tokens

**Files:**
- Create: `index.html`
- Create: `404.html`
- Create: `assets/css/reset.css`
- Create: `assets/css/tokens.css`
- Create: `assets/css/base.css`
- Create: `test/semantics.test.mjs`
- Modify: `test/routes.test.mjs`

**Interfaces:**
- Produces: `.site-header`, `.site-nav`, `.page-main`, `.site-footer`, `.skip-link`, `.eyebrow`, `.display`, `.serif-lede`, `.meta`, and `.text-link` shared class contracts.
- Produces: root CSS tokens consumed by homepage and all project styles.
- Produces: real `index.html` route files and absolute root-relative site navigation.

- [ ] **Step 1: Write failing semantic-shell tests**

Create `test/semantics.test.mjs` using file reads and focused regular expressions. Assert that `index.html` has exactly one `<main>`, a skip link targeting `#main-content`, a `<header>`, a labeled `<nav>`, one `<h1>`, and a `<footer>`. Assert that navigation exposes `Work`, `Background`, `Verified Work`, `GitHub`, and `Contact` in that order.

Extend `test/routes.test.mjs` so every `SITE_ROUTES` entry resolves to a real `index.html` path and `404.html` exists.

Run: `npm test`

Expected: FAIL because the HTML and CSS shell do not exist.

- [ ] **Step 2: Implement the token layer**

Create `assets/css/tokens.css` with this restrained system palette and fluid scale:

```css
:root {
  --paper: #f3f0e9;
  --paper-bright: #fbfaf7;
  --surface: #ffffff;
  --ink: #111213;
  --charcoal: #1b1d1f;
  --muted: #666962;
  --line: #d6d3cc;
  --focus: #111213;
  --font-display: "Arial Black", Arial, Helvetica, sans-serif;
  --font-serif: "Times New Roman", Times, serif;
  --font-sans: Arial, Helvetica, sans-serif;
  --gutter: clamp(1rem, 5.5vw, 6rem);
  --measure: 46rem;
  --page-max: 100rem;
  --section-space: clamp(7rem, 14vw, 15rem);
  --display-hero: clamp(2.75rem, 7vw, 6rem);
  --display-section: clamp(2.125rem, 5vw, 4.5rem);
  --serif-large: clamp(1.75rem, 3.25vw, 2.625rem);
  --serif-body: clamp(1.125rem, 1.75vw, 1.625rem);
  --utility: clamp(0.75rem, 1vw, 0.9375rem);
}
```

Create `reset.css` with box sizing, block media, inherited form typography, and body margin reset. Do not add animated smooth scrolling globally.

- [ ] **Step 3: Implement the accessible publication shell**

Create `index.html` with:

- `<html lang="en">`, UTF-8, responsive viewport, title, description, and canonical URL.
- A first-focusable skip link.
- Publication-style masthead: `CRAIG RAMOS` and `Software + AI Engineering` on the left; the required navigation on the right.
- An empty-but-labeled main sequence of section containers to be filled in Task 4.
- Closing footer with GitHub, public email, LinkedIn, and portfolio source.
- Absolute internal hrefs such as `/#work` and `/projects/ppk076/` so nested-page behavior is predictable.

Create `404.html` as a static editorial error page with `Page not found`, a link to `/`, and no rewrite script.

- [ ] **Step 4: Implement shared layout, focus, and link behavior**

In `base.css`:

- Set warm-white body, near-black text, no background gradients.
- Use the three typography roles from `tokens.css`.
- Set `.page-shell` max width and gutter without wrapping all content in cards.
- Implement `:focus-visible { outline: 3px solid var(--focus); outline-offset: 4px; }` for all interactive elements.
- Keep underlines or equivalent persistent affordance on inline links.
- Make navigation wrap naturally on small screens instead of adding a hamburger/menu script.
- Keep touch targets at least 44 CSS pixels high on narrow viewports.
- Use `scroll-margin-top` for anchored headings; do not use scroll-jacking or forced snap.

- [ ] **Step 5: Run shell tests and keyboard smoke check**

Run:

```powershell
npm test
node scripts/serve.mjs . --port 4173
```

Open `http://127.0.0.1:4173/`. Press Tab and verify the skip link, masthead links, footer links, and visible focus outline follow document order without a trap.

Expected: all unit tests PASS; root and `404.html` load with no missing CSS.

- [ ] **Step 6: Commit the semantic shell**

```powershell
git add index.html 404.html assets/css test/semantics.test.mjs test/routes.test.mjs
git commit -m "feat: add editorial portfolio shell"
```

---

### Task 4: Implement the Homepage Narrative Outside the Aperture

**Files:**
- Modify: `index.html`
- Create: `assets/css/home.css`
- Create: `test/claims.test.mjs`
- Modify: `test/semantics.test.mjs`

**Interfaces:**
- Produces: stable homepage anchors `#work`, `#background`, `#verified-work`, and `#contact`.
- Produces: project links to the five real case-study routes.
- Produces: exact claim strings consumed by the public-safety tests.
- Leaves: the `#aperture` container ready for Task 5 without adding its controller.

- [ ] **Step 1: Write failing homepage-content and claim tests**

Extend `test/semantics.test.mjs` to assert the ordered section landmarks: opening, aperture, systems thesis, selected systems, verified work, professional engineering, background, building toward, closing.

Create `test/claims.test.mjs` to read all public HTML and assert:

```js
assert.match(home, /I BUILD SYSTEMS THAT HAVE TO ANSWER TO REALITY\./);
assert.match(home, /VERIFIED WORK/);
assert.match(home, /176 pallet positions recovered/i);
assert.match(home, /22 storage bins freed/i);
assertNoDeprecatedWarehouseDisclosure(home);
assert.match(home, /313 verification markers/i);
assert.match(home, /zero drops/i);
assert.match(home, /176F4C6E/i);
assert.match(home, /target-specific/i);
```

Run: `npm test`

Expected: FAIL because the sections and claims are not implemented.

- [ ] **Step 2: Add the opening and systems thesis**

Use the exact opening copy:

```text
I BUILD SYSTEMS THAT HAVE TO ANSWER TO REALITY.
My work moves from physical operations and AI evaluation to spatial computing and low-level systems engineering.
```

After the aperture container, add:

```text
I learned physical systems before I learned to abstract them.
Mechanical work > structural work > electronics > warehouse operations > operational software > AI systems > spatial computing > operating systems
```

Use a large display heading only for the primary statement and large serif type for the thesis. Maintain the `statement -> space -> evidence -> space -> explanation` rhythm.

- [ ] **Step 3: Add five asymmetric selected-system summaries**

Under `<section id="work" aria-labelledby="work-title">`, use five semantic `<article>` elements with distinct layout modifiers rather than a shared card appearance:

1. PPK076: wide first-person image plus matched before/after strip; link `/projects/ppk076/`.
2. Warehouse optimization: large `176 / 22` evidence visual with a narrow deterministic-rules explanation; link `/projects/warehouse-optimization/`.
3. Skill Evaluation Lab: evidence-chain visual with methodology copy; link `/projects/skill-evaluation-lab/`.
4. Workspace Environment vNext: room checkpoint with a visible boundary caption stating the application screen is a placeholder at this checkpoint; link `/projects/workspace-environment-vnext/`.
5. PythOS: dark physical-evidence media band inside the otherwise light page, with target-specific metrics; link `/projects/pythos/`.

Every `<img>` gets explicit `width`/`height`, meaningful `alt`, `decoding="async"`, and either `loading="eager"` only for the first viewport image or `loading="lazy"` below the fold.

- [ ] **Step 4: Add VERIFIED WORK as evidence context, not a badge wall**

Add `<section id="verified-work">` with exact heading `VERIFIED WORK` and two editorial evidence rows:

- Operational row: PPK076 / warehouse decision support, exact `176 / 22` result, deterministic rule boundary, and human verification authority.
- Systems row: PythOS, `313 verification markers`, `zero drops`, `CRC 176F4C6E`, and the phrase `target-specific physical evidence`.

Do not use floating certificate badges or the heading `Certificates`. If no public REWORK URL has been supplied, do not render a dead or guessed external link.

- [ ] **Step 5: Add professional engineering, background, direction, and closing**

Add a text-led `Professional engineering` section covering only:

```text
existing React / Node codebases
full-stack business software
Git / PR workflows
testing and production builds
coding-agent SKILL development
repository-aware AI workflows
agent evaluation
documentation and handoff
```

Add `<section id="background">` with this exact progression and short operating lessons, without invented dates or employers:

```text
mechanical work -> structural work -> electronics -> warehouse/logistics -> operational software -> professional software engineering -> AI systems -> PythOS / spatial computing
```

State the connecting idea: physical and operational understanding precedes software abstraction.

Add `What I am building toward` around objects, space, authority, agents, persistent state, hardware, and verification. Close with `CRAIG RAMOS` and `Software / AI / Systems Engineering` plus confirmed links.

- [ ] **Step 6: Style the homepage rhythm**

Create `home.css` with:

- `5-7vw` equivalent outer gutter via `--gutter`.
- `160-240px` fluid major-section gaps via `--section-space`.
- Alternating full-bleed, split, offset, and evidence-band compositions for selected work.
- Borders and rules only where they clarify editorial hierarchy.
- No repeated shadows, glass panels, generic card grid, or decorative rounded containers.
- A single dark evidence band for PythOS rather than making the whole site dark.

- [ ] **Step 7: Run copy, semantics, and responsive source checks**

Run: `npm test`

Expected: all tests PASS, including exact `VERIFIED WORK`, `176 / 22`, and absence of the deprecated historical metric pair.

- [ ] **Step 8: Commit the calm homepage structure**

```powershell
git add index.html assets/css/home.css test/claims.test.mjs test/semantics.test.mjs
git commit -m "feat: add evidence-led homepage narrative"
```

---

### Task 5: Implement the One-Shot Aperture State Machine with TDD

**Files:**
- Create: `assets/js/aperture-controller.js`
- Create: `assets/js/aperture.js`
- Create: `test/aperture-controller.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Produces: `createApertureController({ durations, onFrame, onComplete, schedule, cancel, now }): ApertureController`.
- `ApertureController` exposes `start(): void`, `pause(): void`, `resume(): void`, `stop(): void`, `state(): { index, status, playCount }`.
- DOM adapter consumes `[data-aperture]`, child `[data-aperture-frame]`, `IntersectionObserver`, `document.visibilityState`, and `matchMedia('(prefers-reduced-motion: reduce)')`.
- Frame contract: `data-duration` values `[4000, 3500, 4000, 4000, 4500, 3000]`; frame indexes `0..5`; completion never schedules frame `0` again.

- [ ] **Step 1: Write failing timeline tests**

Create a fake scheduler in `test/aperture-controller.test.mjs` and assert:

- initial state is `{ index: 0, status: 'idle', playCount: 0 }`;
- `start()` emits frame 0 once and increments `playCount` to 1;
- advancing the fake clock uses exactly `4000, 3500, 4000, 4000, 4500, 3000` milliseconds;
- completion state is `complete` at frame 5;
- calling `start()` again after completion does nothing;
- `pause()` cancels the current scheduled transition and `resume()` continues with the remaining time;
- `stop()` prevents later callbacks.

Run: `node --test test/aperture-controller.test.mjs`

Expected: FAIL because the controller module does not exist.

- [ ] **Step 2: Implement the smallest pure controller**

Implement the controller without DOM calls. Use monotonic elapsed time from the injected scheduler. Reject an empty durations array and non-positive durations. Keep the one-shot guard internal rather than in presentation CSS.

Use this state vocabulary only:

```js
const STATUS = Object.freeze({
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  STOPPED: 'stopped'
});
```

- [ ] **Step 3: Verify the pure timeline passes**

Run: `node --test test/aperture-controller.test.mjs`

Expected: PASS with one start, five frame changes, one synthesis hold, and no loop.

- [ ] **Step 4: Add all six semantic aperture frames to the homepage**

Inside `#aperture`, create one `<figure data-aperture>` containing six ordered `<article data-aperture-frame>` elements. Use exact copy and durations:

1. `4000`: `I MODEL PHYSICAL SYSTEMS.` / `Physical operations, modeled in software.`
2. `3500`: `I TURN OPERATIONS INTO DECISION SYSTEMS.` / `176 pallet positions recovered. 22 storage bins freed.`
3. `4000`: `I TEST WHAT AGENTS ACTUALLY DO.` / `Agents tested against preserved evidence.`
4. `4000`: `I RETHINK HOW THE COMPUTER CAN FEEL.` / `Spatial computing, persistent by design.`
5. `4500`: `I BUILD BELOW THE APPLICATION LAYER.` / `A from-scratch, verification-driven operating system.`
6. `3000`: `PHYSICAL SYSTEMS. SOFTWARE SYSTEMS. AI SYSTEMS. COMPUTER SYSTEMS.` then `I BUILD WHERE THOSE LAYERS MEET.`

Frame 1 includes the first-person forklift image plus the matched-camera before/after pair as transition layers. Frame 5 preserves visible laptop bezel and may cut briefly to the architecture diagram. Frame 6 is text-only. Add an ordered visually hidden transcript of all six states so the complete concept exists in the accessibility tree without an `aria-live` announcement every few seconds.

Only the first frame has live `src`/`srcset` values in the initial document. Frames 2-5 keep responsive candidates in `data-src`/`data-srcset`; `aperture.js` exposes `hydrateFrame(frameElement)` to promote those attributes for the active frame and its immediate successor. This prevents every hidden aperture asset from downloading before meaningful viewport entry while preserving dimensions, alt text, and the static transcript.

- [ ] **Step 5: Wire meaningful entry, visibility pause, and reduced-motion mode**

In `assets/js/aperture.js`:

- Observe the aperture at threshold `0.55` with root margin `0px 0px -10% 0px`.
- Start only on the first intersecting callback.
- Pause while the document is hidden or the aperture is fully out of view; resume instead of restarting.
- Set `data-motion="full"` or `data-motion="reduced"` from `matchMedia`.
- Hydrate the active frame and one successor on start, then hydrate the next successor at each cut.
- In reduced mode, keep the same timeline and copy but apply immediate frame cuts; never add transforms or opacity transitions.
- Set `data-frame`, `data-status`, and `data-play-count` for deterministic browser tests.
- Do not add click, swipe, previous/next, dot, or keyboard handlers because the aperture is not a user-controlled carousel.

Load the adapter as `<script type="module" src="/assets/js/aperture.js"></script>`.

- [ ] **Step 6: Run unit and source-contract tests**

Add semantic assertions for six frames, exact statements, exact durations, absence of `carousel`, absence of arrow/dot controls, and absence of `loop`.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit the aperture behavior**

```powershell
git add index.html assets/js test/aperture-controller.test.mjs test/semantics.test.mjs
git commit -m "feat: add authored aperture timeline"
```

---

### Task 6: Style and Verify Desktop, Mobile, and Reduced-Motion Aperture Behavior

**Files:**
- Create: `assets/css/aperture.css`
- Create: `playwright.config.mjs`
- Create: `test/browser/aperture.spec.mjs`
- Modify: `index.html`
- Modify: `assets/css/home.css`

**Interfaces:**
- Produces: desktop aperture at `width: min(72vw, 77.5rem)`, capped by the page gutters, and approximately `2.2 / 1` aspect ratio.
- Produces: tablet aperture at `16 / 10`; mobile aperture at `4 / 5` with simplified cuts and project-specific `object-position`.
- Consumes: `data-frame`, `data-status`, and `data-motion` set by the DOM adapter.
- Produces: Playwright projects named `desktop`, `tablet`, `mobile`, and `reduced-motion`.

- [ ] **Step 1: Write failing browser tests for authored behavior**

Configure Playwright with base URL `http://127.0.0.1:4173`, `webServer.command` set to `npm run preview`, and these viewports:

```js
[
  { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  { name: 'tablet', use: { viewport: { width: 834, height: 1112 } } },
  { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  { name: 'reduced-motion', use: { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' } }
]
```

In `test/browser/aperture.spec.mjs`, assert:

- the aperture does not play before meaningful viewport entry;
- after scrolling into view, `data-play-count` becomes `1`;
- leaving and re-entering does not increment it above `1`;
- no buttons, dot navigation, or `aria-roledescription="carousel"` exist;
- desktop aspect ratio is between `2.05` and `2.35`;
- mobile aspect ratio is between `0.72` and `0.92` and page scrolling remains native;
- reduced mode reports `data-motion="reduced"`, all six transcript entries exist, and computed frame transition/animation durations are zero.

Run: `npm run build && npx playwright test test/browser/aperture.spec.mjs`

Expected: FAIL because the aperture CSS and build/preview scripts are incomplete.

- [ ] **Step 2: Implement desktop aperture composition**

In `aperture.css`:

- Use a hard-edged overflow-hidden viewport with minimal/no chrome and no permanent index UI.
- Use layered absolute frames with `visibility`, `opacity`, `clip-path`, and restrained `transform` only when the active frame's motion job requires it.
- Limit image drift to `scale(1)` -> `scale(1.025)`.
- Use a direct or narrow mask cut for the PPK matched-camera transition.
- Use a short horizontal evidence-chain crop for Skill Evaluation.
- Use a small perspective/object push for Workspace without inventing content.
- Use a hard physical-terminal-to-architecture cut for PythOS.
- Keep statement and hint typography legible against media using solid local backing only when required; no glass blur.

- [ ] **Step 3: Implement mobile aperture translation**

At `max-width: 47.99rem`:

- Switch to `aspect-ratio: 4 / 5` and width `calc(100vw - 2 * var(--gutter))`.
- Disable mask travel, long transforms, and desktop crop drift.
- Use direct still cuts and project-specific `object-position` values.
- Place large statements in a stable lower text field so each state remains readable.
- Preserve synthesis as a text-only final field.
- Do not use horizontal swipe or scroll snap.

- [ ] **Step 4: Implement explicit reduced-motion CSS**

Use both the media query and `data-motion` hook:

```css
@media (prefers-reduced-motion: reduce) {
  [data-aperture] *,
  [data-aperture] *::before,
  [data-aperture] *::after {
    animation: none !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
  }

  [data-aperture-frame] { transform: none !important; }
}
```

The JavaScript still advances through the six states with immediate still/text changes. The visually hidden transcript and later selected-work sections retain all information without motion.

- [ ] **Step 5: Complete the build/preview minimum needed for browser tests**

Implement the initial `scripts/build.mjs` and `scripts/serve.mjs` contracts described in Task 12 now, limited to copying the existing `DEPLOY_ENTRIES` and serving directory indexes. Task 12 will add full audit and documentation.

- [ ] **Step 6: Run aperture browser verification**

Run:

```powershell
npm run build
npx playwright install chromium
npx playwright test test/browser/aperture.spec.mjs
```

Expected: PASS in all four projects; no loop and no reduced-motion transitions.

- [ ] **Step 7: Commit responsive aperture presentation**

```powershell
git add assets/css/aperture.css assets/css/home.css playwright.config.mjs scripts/build.mjs scripts/serve.mjs test/browser/aperture.spec.mjs index.html
git commit -m "feat: add responsive aperture presentation"
```

---

### Task 7: Build the PPK076 Spatial Case Study

**Files:**
- Create: `projects/ppk076/index.html`
- Create: `assets/css/project.css`
- Create: `assets/css/projects/ppk076.css`
- Modify: `test/routes.test.mjs`
- Modify: `test/semantics.test.mjs`
- Modify: `test/claims.test.mjs`

**Interfaces:**
- Produces: `/projects/ppk076/` with all eight shared information-architecture headings.
- Consumes: ten traced PPK assets and confirmed source/demo links.
- Produces: reusable `.project-header`, `.project-section`, `.evidence-figure`, `.fact-list`, `.boundary-note`, and `.project-links` base classes without dictating identical page composition.

- [ ] **Step 1: Write failing PPK route/content tests**

Assert that the route file exists, has one `<main>`, has the eight shared headings in order, references only registered PPK assets, and contains both confirmed URLs:

```text
https://github.com/craigCODA/ppk076
https://craigcoda.github.io/ppk076/
```

Assert that page copy includes `manual export`, `local parsing`, and `no SAP return path`, but contains no pasted inventory records.

Run: `npm test`

Expected: FAIL because the page does not exist.

- [ ] **Step 2: Implement the image-led spatial page**

Use the full-facility oblique image as the opening evidence, not a generic card hero. Follow with:

- `Problem`: physical layout, storage, movement, and training are difficult to reason about as disconnected records.
- `What I built`: an offline-capable browser-based Three.js warehouse simulation with walking/forklift interaction, camera modes, PWA support, WebXR-compatible browser direction, and Electron packaging.
- `Architecture / decisions`: modeled physical regions, manual supported export -> local parser -> visualization, and no return path to SAP.
- `Evidence`: top-down relationships, rack/floor distinction, operational relationship, matched-camera before/after inventory visualization, and security/multisite diagrams.
- `Result`: software makes spatial occupancy and operating relationships inspectable; avoid adding warehouse optimization metrics to this page unless explicitly contextualized as the separate decision-support project.
- `Technologies`: Three.js, JavaScript, CSS, PWA/service worker, WebXR-capable browser path, Electron, Node build scripts.
- `Current boundary / unfinished work`: a simulation and decision/training aid, not a live bidirectional SAP client; optional movement capture is not required for the initial site.
- `Source / demo / verification`: confirmed repository and live demo.

- [ ] **Step 3: Style PPK076 as a spatial sequence**

Use full-width evidence, a matched two-frame comparison with consistent crop, a top-down inset, and a narrow architecture/security band. Do not use the same column proportions planned for the other four pages.

On narrow screens, stack the matched pair with `Before local import visualization` and `After supported local import visualization` captions; keep both cameras fully legible and avoid drag sliders that require pointer precision.

- [ ] **Step 4: Run PPK tests and visual smoke check**

Run:

```powershell
npm test
npm run build
npx playwright test test/browser/navigation.spec.mjs --project=desktop
```

Expected: route, headings, assets, source/demo links, and claim boundaries PASS.

- [ ] **Step 5: Commit the PPK case study**

```powershell
git add projects/ppk076 assets/css/project.css assets/css/projects/ppk076.css test
git commit -m "feat: add PPK076 evidence case study"
```

---

### Task 8: Build the Warehouse Optimization Evidence Case Study

**Files:**
- Create: `projects/warehouse-optimization/index.html`
- Create: `assets/css/projects/warehouse.css`
- Modify: `test/claims.test.mjs`
- Modify: `test/semantics.test.mjs`
- Modify: `test/assets.test.mjs`

**Interfaces:**
- Produces: `/projects/warehouse-optimization/` with exact verified metrics and all shared headings.
- Consumes: only the generated public-safe result visual for warehouse-specific media.
- Enforces: no raw SVG, site-identifying titles, location codes, source-system row exports, or deprecated historical results in public output.

- [ ] **Step 1: Write failing warehouse disclosure tests**

Assert the page contains:

```text
176 pallet positions recovered
22 storage bins freed
Measured before/after occupancy
Human verification remained authoritative
```

Assert it does not contain the deprecated metric pair, site-identifying title, location codes, or excluded raw map filename.

Run: `npm test`

Expected: FAIL because the page does not exist.

- [ ] **Step 2: Implement the evidence-led warehouse page**

Use:

- `Problem`: operational storage decisions were constrained by real occupancy and handling rules, not an abstract capacity number.
- `What I built`: deterministic decision support that compares occupancy, applies explicit rules, and produces a reviewable proposal.
- `Architecture / decisions`: input normalization -> deterministic rule evaluation -> before/after comparison -> human verification; keep the human decision boundary explicit.
- `Evidence`: the supplied public-safe abstraction, a textual methodology ledger, and a concise explanation that the visual is not a live SAP or facility map.
- `Result`: exactly `176 pallet positions recovered` and `22 storage bins freed`.
- `Technologies`: list only the technologies the user confirms from the underlying work during execution; until then describe `deterministic rules`, `data transformation`, and `verification workflow` without naming an unverified language or platform.
- `Current boundary / unfinished work`: no raw operational dataset is published; this result belongs to one verified run and is not combined with a separate historical analysis.
- `Source / demo / verification`: identify the result as REWORK-verified in prose. Omit an external credential anchor unless the owner supplies its authoritative public URL.

- [ ] **Step 3: Style as an operational evidence ledger**

Place the `176` and `22` result at editorial scale beside the public-safe grid, followed by a linear rules/verification ledger. Use square rules and generous whitespace, not rounded KPI cards or a fake dashboard.

- [ ] **Step 4: Run exact-claim and asset-boundary tests**

Run:

```powershell
npm test
npm run build
npm run audit
```

Expected: PASS; no deprecated historical result, internal location code, or raw SVG reaches `dist/`.

- [ ] **Step 5: Commit the warehouse case study**

```powershell
git add projects/warehouse-optimization assets/css/projects/warehouse.css test
git commit -m "feat: add verified warehouse case study"
```

---

### Task 9: Build the Skill Evaluation Lab Evidence-Record Case Study

**Files:**
- Create: `projects/skill-evaluation-lab/index.html`
- Create: `assets/css/projects/skill-lab.css`
- Modify: `test/claims.test.mjs`
- Modify: `test/semantics.test.mjs`

**Interfaces:**
- Produces: `/projects/skill-evaluation-lab/` with all shared headings.
- Consumes: generated evidence map, source repository, and evidence release URLs.
- Enforces: captured saved-state caption and evidence-backed claim narrowing.

- [ ] **Step 1: Write failing evaluation-method tests**

Assert the page contains `Control`, `Isolate`, `Compare`, `Replicate`, `Verify`, `preserved failures`, `SHA-256`, `experimental`, and `captured saved record`. Assert it links to both the source and the `evidence-0001-0015` release.

Assert it does not call the evidence visual a dashboard and does not claim that the candidate is a general improvement.

Run: `npm test`

Expected: FAIL because the page does not exist.

- [ ] **Step 2: Implement the evidence-record page**

Use:

- `Problem`: skills are behavioral interventions; polished wording does not prove changed agent behavior.
- `What I built`: a persistent lab that connects canonical artifacts, controlled experiments, preserved run evidence, histories, reports, and verification tooling.
- `Architecture / decisions`: immutable Mother + disposable Active isolation; original/no-skill/candidate conditions; global run identity; prompt/baseline/model/harness controls; result and transcript hashing.
- `Evidence`: failures preserved before cleanup, cross-model replication, exact result state, transcripts for process claims, and command output for verification claims.
- `Result`: evidence can support, narrow, or reject a behavioral claim; effects that do not reproduce do not become general claims.
- `Technologies`: repository workflows, Python verification tooling, SHA-256 manifests, structured experiment records, agent harnesses.
- `Current boundary / unfinished work`: experimental candidates are not promoted as general improvements; the supplied image's `0031` block is a captured saved record and is not presented as live status for the public repository.
- `Source / demo / verification`: source and the confirmed evidence release.

- [ ] **Step 3: Style as a preserved research record**

Use a left-to-right evidence chain on wide screens and a numbered vertical sequence on mobile. Give failures and boundaries the same visual weight as successful evidence. Avoid charts, live counters, sidebar navigation, or SaaS dashboard styling.

- [ ] **Step 4: Run methodology and link tests**

Run:

```powershell
npm test
npm run build
```

Expected: PASS; the page accurately distinguishes saved evidence state from live repository status.

- [ ] **Step 5: Commit the Skill Evaluation Lab case study**

```powershell
git add projects/skill-evaluation-lab assets/css/projects/skill-lab.css test
git commit -m "feat: add skill evaluation evidence case study"
```

---

### Task 10: Build the Workspace Environment Spatial/Authority Case Study

**Files:**
- Create: `projects/workspace-environment-vnext/index.html`
- Create: `assets/css/projects/workspace.css`
- Modify: `test/claims.test.mjs`
- Modify: `test/semantics.test.mjs`

**Interfaces:**
- Produces: `/projects/workspace-environment-vnext/` with all shared headings.
- Consumes: the saved M2A room checkpoint and confirmed source URL.
- Enforces: host authority and explicit placeholder/unfinished streaming boundary.

- [ ] **Step 1: Write failing Workspace boundary tests**

Assert the page contains all of:

```text
saved M2A room checkpoint
placeholder application screen
live generic Windows surface streaming was not complete at this checkpoint
World Core owns durable truth
host-controlled authority
```

Assert the page contains no phrase equivalent to `completed live Windows streaming` and no invented application screenshot.

Run: `npm test`

Expected: FAIL because the page does not exist.

- [ ] **Step 2: Implement the spatial/authority page**

Use:

- `Problem`: conventional windows expose applications but do not give spatial objects, relationships, behavior, and persistent state durable semantic identity.
- `What I built`: the current vNext runtime foundation and M2A room checkpoint direction, with spatial objects, direct manipulation, persistence, and a Windows-first host boundary.
- `Architecture / decisions`: World Core owns durable truth; Three.js stays in the trusted renderer; descriptors and resource updates cross validated boundaries; files, processes, applications, network, and credentials remain host-controlled.
- `Evidence`: saved room checkpoint, visible object list, trusted controls, changed state, and persistence direction.
- `Result`: a real spatial-room checkpoint and implemented authority model, not a claim that the final live-app product is complete.
- `Technologies`: TypeScript, Three.js, Electron, Node workspaces, Windows/.NET host direction, tests and production packaging.
- `Current boundary / unfinished work`: exact sentence `The large application screen is a placeholder in this saved M2A room checkpoint; live generic Windows surface streaming was not complete at this checkpoint.`
- `Source / demo / verification`: confirmed source; do not invent a live demo.

- [ ] **Step 3: Style as a spatial architecture page**

Use the room image as a large quiet plane, an offset World Core/authority column, and a clear unfinished-work boundary below it. Do not add fake Windows content to the screen, glass overlays, or animated 3D decoration.

- [ ] **Step 4: Run boundary and responsive tests**

Run:

```powershell
npm test
npm run build
npx playwright test test/browser/navigation.spec.mjs --project=mobile
```

Expected: PASS; placeholder disclosure remains visible on mobile and desktop.

- [ ] **Step 5: Commit the Workspace case study**

```powershell
git add projects/workspace-environment-vnext assets/css/projects/workspace.css test
git commit -m "feat: add workspace authority case study"
```

---

### Task 11: Build the PythOS Technical Evidence Case Study

**Files:**
- Create: `projects/pythos/index.html`
- Create: `assets/css/projects/pythos.css`
- Modify: `test/claims.test.mjs`
- Modify: `test/semantics.test.mjs`
- Modify: `test/routes.test.mjs`

**Interfaces:**
- Produces: `/projects/pythos/` while leaving independent `/pythos/` untouched.
- Consumes: four traced PythOS assets, source/docs/release links.
- Enforces: target-specific metrics and architecture/implementation/evidence/unfinished separation.

- [ ] **Step 1: Write failing PythOS route and scope tests**

Assert:

- the portfolio route is `projects/pythos/index.html`;
- no root `pythos/index.html` exists;
- the page links to `https://craigcoda.github.io/pythos/` rather than shadowing it;
- the page contains `313 verification markers`, `zero drops`, `CRC 176F4C6E`, `target-specific physical evidence`, and `not a claim of universal hardware support`;
- headings visibly distinguish `Governing architecture`, `Verified implementation`, `Physical evidence`, and `Current boundary / unfinished work`.

Run: `npm test`

Expected: FAIL because the portfolio page does not exist.

- [ ] **Step 2: Implement the technical evidence page**

Use:

- `Problem`: prove low-level system behavior across architecture, emulation, persistence, authorization, and a specific physical target without allowing broad claims to outrun evidence.
- `What I built`: a from-scratch verification-driven x86-64 operating system line with UEFI boot, native PythCore, protected ring-3 execution, typed persistent objects, capability-controlled authority, checkpoint/recovery evidence, and local package lifecycle work through the approved Phase 13 credential boundary.
- `Architecture / decisions`: names locate, relationships describe, capabilities authorize; separate governing design from accepted implementation evidence.
- `Evidence`: QEMU acceptance harnesses plus the physical terminal photograph; preserve laptop bezel.
- `Result`: `On the documented target-specific physical evidence path: 313 verification markers, zero drops, CRC 176F4C6E.`
- `Technologies`: Rust, x86-64, UEFI, QEMU, Python acceptance harnesses, capability-based design, persistent typed objects.
- `Current boundary / unfinished work`: `This is not a claim of universal hardware support.` List later presentation/input bridges, networking, AI work, remote registries, and SMP outside the supplied Phase 13 credential boundary without implying they are abandoned.
- `Source / demo / verification`: source, independent documentation at `/pythos/`, and confirmed physical-storage release.

- [ ] **Step 3: Style PythOS as stark evidence within a light document**

Keep the project page calmer than the homepage. Use a dark physical-terminal band and otherwise light editorial sections. Pair the architecture boundary image with narrow evidence text, then use the two portrait evidence/boundary documents as a deliberate vertical pair. Do not turn the whole page into a terminal theme.

- [ ] **Step 4: Run PythOS collision and claim tests**

Run:

```powershell
npm test
npm run build
npm run audit
```

Expected: PASS; `dist/projects/pythos/index.html` exists, `dist/pythos/` does not, and the external docs link remains `/pythos/`.

- [ ] **Step 5: Commit the PythOS case study**

```powershell
git add projects/pythos assets/css/projects/pythos.css test
git commit -m "feat: add scoped PythOS evidence case study"
```

---

### Task 12: Complete the Production Build, Public-Output Audit, and CI Gate

**Files:**
- Modify: `scripts/build.mjs`
- Create: `scripts/audit-public-output.mjs`
- Modify: `scripts/serve.mjs`
- Create: `.github/workflows/site-quality.yml`
- Create: `README.md`
- Modify: `test/routes.test.mjs`
- Modify: `test/assets.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `dist/` containing only `DEPLOY_ENTRIES` and no confidential/excluded source.
- Produces: `npm run build`, `npm run audit`, `npm run preview`, and `npm run check` as documented local/CI commands.
- Produces: CI validation only; does not call `actions/deploy-pages` and does not alter Pages settings.

- [ ] **Step 1: Write failing production-output audit tests**

Extend route and asset tests to build `dist/` and assert:

- each `SITE_ROUTES` route resolves to its built `index.html`;
- `.nojekyll` and `.well-known/assetlinks.json` built hashes match the protected values;
- no `dist/pythos/` directory exists;
- no raw warehouse SVG exists;
- every local `href`, `src`, and `srcset` target resolves;
- every public image is listed in `provenance.json`;
- every `<img>` has non-empty `alt`, numeric `width`/`height`, and explicit loading behavior;
- there is no root service worker registration or `service-worker.js`.

Run: `npm run build`

Expected: FAIL until the full audit is implemented.

- [ ] **Step 2: Finish the allowlisted build script**

In `scripts/build.mjs`:

1. Resolve `dist` under the repository root and refuse cleanup if the resolved path is not exactly `<repo>/dist`.
2. Remove only that verified `dist` directory.
3. Copy each `DEPLOY_ENTRIES` member recursively.
4. Preserve dotfiles.
5. Call the audit module against `dist`.
6. Print route count, asset count, and total bytes.

Do not copy `docs/`, `scripts/`, `test/`, `node_modules/`, the external asset pack, or `.git/`.

- [ ] **Step 3: Implement the audit utility**

`scripts/audit-public-output.mjs` must:

- walk built HTML/CSS/JS/media;
- reject unresolved internal references;
- reject the excluded warehouse-map filename and title, the deprecated historical result pair, and sensitive operational details;
- assert exact warehouse result strings;
- assert the Workspace placeholder sentence;
- assert target-specific PythOS language;
- reject a built top-level `pythos` directory;
- compare protected hashes;
- verify all expected source/demo/verification links from the confirmed registry are present where planned;
- exit non-zero with the exact file and failed rule.

- [ ] **Step 4: Finish the dependency-free preview server**

`scripts/serve.mjs` accepts a root directory and `--port`. It must map `/path/` to `/path/index.html`, serve a real `404.html` with status 404, set MIME types for HTML/CSS/JS/JSON/AVIF/WebP/PNG/JPEG/SVG, and reject path traversal. It must not implement SPA fallback behavior.

- [ ] **Step 5: Add CI without changing deployment**

Create `.github/workflows/site-quality.yml`:

```yaml
name: Site quality

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run check
```

Do not add Pages permissions, artifact upload, or deployment actions. GitHub Pages remains `main:/`.

- [ ] **Step 6: Document ownership and safe deployment**

Create `README.md` with:

- `npm ci`, `npm run assets`, `npm test`, `npm run build`, `npm run preview`, `npm run check`.
- Node 24 requirement.
- Root Pages owner: this repository `main:/`.
- PythOS Pages owner: `craigCODA/pythos main:/docs`.
- A warning not to create root `pythos/`, change `.well-known/assetlinks.json`, add an SPA fallback, or register a root service worker.
- Asset provenance and public-safety process.
- Exact pre-release checks for `/`, `/pythos/`, `.well-known/assetlinks.json`, project routes, and external links.

- [ ] **Step 7: Run the complete production gate**

Run:

```powershell
npm ci
npm run assets
npm test
npm run build
npm run audit
npx playwright install chromium
npm run test:browser
```

Expected: every command exits 0; build output has no missing paths or excluded material.

- [ ] **Step 8: Commit build, audit, and CI**

```powershell
git add .github README.md package.json package-lock.json scripts test
git commit -m "ci: verify static portfolio output"
```

---

### Task 13: Complete Accessibility, Keyboard, Responsive, and Performance Verification

**Files:**
- Create: `test/browser/accessibility.spec.mjs`
- Create: `test/browser/navigation.spec.mjs`
- Create: `test/browser/performance.spec.mjs`
- Modify: HTML/CSS/JS files only when a failing test demonstrates a defect

**Interfaces:**
- Consumes: all production routes from `SITE_ROUTES`.
- Produces: repeatable browser acceptance across desktop, tablet, mobile, and reduced-motion projects.
- Produces: budgets for layout stability, failed requests, JavaScript/CSS weight, and initial aperture media.

- [ ] **Step 1: Write keyboard and semantic browser tests**

For every route, assert:

- skip link becomes visible on first Tab and moves focus to `main`;
- headings have one `h1` and do not skip from `h1` directly to `h3`;
- all interactive elements are reachable in DOM order;
- every focused element has a visible outline at least 2 CSS pixels wide;
- no keyboard trap occurs;
- all images have computed accessible names or intentionally empty alt only when decorative (the planned evidence images are not decorative);
- landmarks are exposed as banner/navigation/main/contentinfo;
- no horizontal overflow exists at 390, 834, or 1440 CSS pixels.

Run: `npx playwright test test/browser/accessibility.spec.mjs`

Expected: initially FAIL on any missing label, heading, focus style, or overflow.

- [ ] **Step 2: Write navigation and direct-refresh tests**

For every `SITE_ROUTES` URL:

- navigate directly rather than clicking from `/`;
- assert response status 200;
- reload and assert status 200 again;
- click home/project/source/demo/docs links and verify the intended target;
- assert the PythOS docs link is exactly `https://craigcoda.github.io/pythos/`;
- collect all failed requests and console errors; require none.

Run: `npx playwright test test/browser/navigation.spec.mjs`

Expected: initially FAIL on any broken route or asset path.

- [ ] **Step 3: Write performance and layout-stability tests**

On desktop and mobile homepages:

- observe layout shifts and require cumulative layout shift below `0.1` after initial load and after aperture start;
- require CSS total below `100 KB` uncompressed;
- require first-load JavaScript total below `50 KB` uncompressed;
- require the first aperture image response below `450 KB` desktop and `180 KB` mobile;
- assert non-active aperture frames are not all fetched before the aperture enters view;
- assert below-fold project images use lazy loading;
- assert only the first meaningful visual uses `fetchpriority="high"`;
- assert width/height or stable aspect ratio reserves media space.

Run: `npx playwright test test/browser/performance.spec.mjs`

Expected: initially FAIL on any budget or layout defect.

- [ ] **Step 4: Fix only demonstrated accessibility/responsive/performance defects**

Make the smallest focused changes indicated by failing tests. Preserve the visual contract: do not solve overflow by shrinking narrative text below the mobile scale, do not remove evidence to meet budgets, and do not add motion or navigation chrome.

- [ ] **Step 5: Perform manual visual and assistive review at exact targets**

With `npm run preview` running, inspect:

| Mode | Viewport / setting | Acceptance focus |
|---|---|---|
| Desktop | 1440 x 1000 | 68-74vw aperture, editorial whitespace, asymmetric work sections |
| Wide desktop | 1920 x 1080 | max-width restraint, no overexpanded lines |
| Tablet | 834 x 1112 | readable masthead wrapping, 16:10 aperture, evidence order |
| Mobile | 390 x 844 | 4:5 aperture, no clipped statements, native scroll, 44px targets |
| Small mobile | 320 x 568 | no horizontal overflow, readable utility text |
| Reduced motion | OS/browser reduce setting | instant cuts, no transforms/fades, same six-state transcript |
| Keyboard | keyboard only | skip link, visible focus, logical link order, no trap |

Also zoom desktop to 200% and confirm reflow without lost content.

- [ ] **Step 6: Run the full gate twice**

Run:

```powershell
npm run check
npm run check
git status --short
```

Expected: two clean passes; no generated `dist/`, Playwright reports, screenshots, or node modules are staged.

- [ ] **Step 7: Commit acceptance fixes and tests**

```powershell
git add assets index.html projects test playwright.config.mjs
git commit -m "test: verify portfolio accessibility and performance"
```

---

### Task 14: Review Claims, Verify Both GitHub Pages Owners, and Prepare Deployment

**Files:**
- Modify: only files implicated by review findings
- Verify: built output and live URLs

**Interfaces:**
- Consumes: complete site and all prior automated gates.
- Produces: evidence that `/` is ready to publish and `/pythos/` remains independently functional.
- Produces: final review notes with exact route/link/claim results.

- [ ] **Step 1: Run the final confidential-material and claim audit**

Inspect `git diff origin/main...HEAD --name-only` and `dist/`. Confirm:

- no source-system record export, internal email, personnel image, access form, detailed warehouse map, or NerdLife/client artifact was added;
- raw warehouse SVG and bin labels are absent;
- only 176/22 appears for Warehouse Optimization;
- Workspace has the explicit placeholder/incomplete streaming sentence;
- PythOS metrics are target-specific and not universalized;
- Skill Evaluation `0031` is captioned as a captured saved record;
- all credentials/evidence sit with relevant project work, not as decorative badges.

Run:

```powershell
npm run audit
npm run audit:source
```

Expected: both public-output and legacy Pages source audits PASS.

- [ ] **Step 2: Use the required Superpowers completion review**

Invoke `superpowers:verification-before-completion`, then `superpowers:requesting-code-review`. Address concrete findings with new failing tests before fixes. Rerun `npm run check` after every fix round.

- [ ] **Step 3: Verify the current live preservation baseline before merge**

Run:

```powershell
curl.exe -I https://craigcoda.github.io/pythos/
curl.exe -I https://craigcoda.github.io/.well-known/assetlinks.json
gh api repos/craigCODA/craigcoda.github.io/pages --jq '{status,build_type,source,html_url}'
gh api repos/craigCODA/pythos/pages --jq '{status,build_type,source,html_url}'
```

Expected before merge:

- `/pythos/` HTTP 200.
- assetlinks HTTP 200.
- root Pages remains `legacy`, `main`, `/`.
- PythOS Pages remains `legacy`, `main`, `/docs`.

- [ ] **Step 4: Prepare the branch for owner-approved merge/deployment**

Run:

```powershell
git status --short --branch
git log --oneline --decorate origin/main..HEAD
git diff --check origin/main...HEAD
npm run check
```

Expected: clean worktree, focused commits, no whitespace errors, all checks PASS. Do not change Pages settings and do not modify the PythOS repository.

- [ ] **Step 5: After owner-approved merge to `main`, verify the live root and preservation paths**

Poll only long enough for the legacy Pages build to finish, then run:

```powershell
curl.exe -I https://craigcoda.github.io/
curl.exe -I https://craigcoda.github.io/projects/ppk076/
curl.exe -I https://craigcoda.github.io/projects/warehouse-optimization/
curl.exe -I https://craigcoda.github.io/projects/skill-evaluation-lab/
curl.exe -I https://craigcoda.github.io/projects/workspace-environment-vnext/
curl.exe -I https://craigcoda.github.io/projects/pythos/
curl.exe -I https://craigcoda.github.io/pythos/
curl.exe -sS https://craigcoda.github.io/.well-known/assetlinks.json
```

Expected: every portfolio route and `/pythos/` returns 200; the live assetlinks JSON matches the protected file.

- [ ] **Step 6: Run live browser verification**

Point Playwright's base URL at `https://craigcoda.github.io` and rerun navigation, keyboard, reduced-motion, mobile, and failed-request checks. Confirm external source/demo/verification links resolve and no asset path is broken on GitHub Pages.

- [ ] **Step 7: Record the final acceptance result**

Report:

- production build command/result;
- desktop/tablet/mobile/reduced-motion/keyboard results;
- `/` and every project route status;
- `/pythos/` status and unchanged Pages owner/source;
- `.well-known/assetlinks.json` hash/result;
- confirmed source/demo/verification links;
- confidential-material audit result;
- claim-boundary audit result for Warehouse, Workspace, Skill Evaluation, and PythOS.

Do not call the work complete until both `/` and `/pythos/` pass live verification.

---

## Implementation Stage Summary

1. Protect current root and independent PythOS deployment contracts.
2. Import only public-safe evidence with manifest traceability and responsive derivatives.
3. Establish the semantic light/editorial shell and calm homepage narrative.
4. Build and verify the authored one-shot aperture across desktop, mobile, and reduced motion.
5. Implement five calmer, evidence-specific project pages with shared information architecture but distinct compositions.
6. Add an allowlisted production build, public-output audit, and non-deploying CI gate.
7. Verify accessibility, keyboard behavior, layout stability, responsive behavior, asset performance, links, and confidential-material boundaries.
8. Merge only after review, then verify the live root and independently published `/pythos/` together.

## Known Inputs Still Needed From the Owner

- An authoritative public REWORK credential URL or credential asset for the verified `176 / 22` result, if it should be externally linked. In its absence, implementation will state the verification context without inventing a link or creating a badge.
- Any preferred public source/demo/verification destination for Warehouse Optimization beyond the verified result visual. In its absence, no external source/demo link will be shown for that project.

These missing links do not block layout, behavior, accessibility, build, or the other four project pages. They do block claiming that Warehouse Optimization has an external public verification link.
