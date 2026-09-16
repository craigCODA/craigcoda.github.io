import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertWarehouseDisclosureEntries } from './warehouse-boundary.mjs';

const publicDocuments = [
  '../index.html',
  '../404.html',
  '../projects/ppk076/index.html',
  '../projects/warehouse-optimization/index.html',
  '../projects/skill-evaluation-lab/index.html',
  '../projects/workspace-environment-vnext/index.html',
  '../projects/pythos/index.html'
];

function ppkVisibleText(markup) {
  return markup
    .replace(/<head\b[\s\S]*?<\/head>/gi, '')
    .replace(/<(?:script|style|template)\b[\s\S]*?<\/(?:script|style|template)>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|nbsp);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertNoPpkVisibleMetrics(text) {
  const metrics = [...text.matchAll(/(?<![\p{L}\p{N}])(176|22|222|26)(?![\p{L}\p{N}])/gu)].map((match) => match[1]);

  assert.deepEqual(metrics, [], `PPK visible text must not publish warehouse metrics: ${metrics.join(', ')}`);
}

function assertWarehouseDisclosure(markup) {
  const visibleText = ppkVisibleText(markup);
  const expectedHeadings = [
    'Problem',
    'What I built',
    'Architecture / decisions',
    'Evidence',
    'Result',
    'Technologies',
    'Current boundary / unfinished work',
    'Source / demo / verification'
  ];
  const headings = [...markup.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const technologies = markup.match(/<section\b[^>]*\bwarehouse-technologies\b[^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? '';
  const technologyItems = [...technologies.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const requiredBoundaryStatements = [
    { label: 'no raw operational dataset', pattern: /No raw operational dataset is published/i, text: 'No raw operational dataset is published.' },
    { label: 'one verified run', pattern: /This result belongs to one verified run/i, text: 'This result belongs to one verified run' },
    { label: 'separate historical analysis', pattern: /not combined with a separate historical analysis/i, text: 'not combined with a separate historical analysis' }
  ];

  assert.deepEqual(headings, expectedHeadings);
  assert.deepEqual(technologyItems, ['Deterministic rules', 'Data transformation', 'Verification workflow']);
  assert.doesNotMatch(technologies, /(?:Three\.js|JavaScript|TypeScript|Python|SQL|Node|React|SAP)/i);
  for (const { label, pattern } of requiredBoundaryStatements) {
    assert.match(visibleText, pattern, `missing warehouse boundary statement: ${label}`);
  }
  assert.match(visibleText, /REWORK-verified/i);
  assert.equal((markup.match(/<a\b[^>]*\bhref=["']https?:\/\//gi) ?? []).length, 0, 'warehouse route must not invent external credential anchors');
  assertWarehouseDisclosureEntries([{ path: 'projects/warehouse-optimization/index.html', content: markup }]);

  return { expectedHeadings, requiredBoundaryStatements };
}

const approvedPpkVisibleContent = [
  { label: 'physical layout problem', pattern: /physical layout, storage, movement, and training/i },
  { label: 'disconnected records problem', pattern: /disconnected records/i },
  { label: 'offline Three.js simulation', pattern: /offline-capable browser-based Three\.js warehouse simulation/i },
  { label: 'walking and forklift interaction', pattern: /walking and forklift interaction/i },
  { label: 'camera modes', pattern: /camera modes/i },
  { label: 'PWA support', pattern: /PWA support/i },
  { label: 'WebXR browser direction', pattern: /WebXR-compatible browser direction/i },
  { label: 'Electron packaging', pattern: /Electron packaging/i },
  { label: 'modeled physical regions', pattern: /physical regions are modeled as regions with meaning/i },
  { label: 'manual export boundary', pattern: /manual export/i },
  { label: 'local parsing boundary', pattern: /local parsing/i },
  { label: 'no SAP return path', pattern: /no SAP return path/i },
  { label: 'top-down evidence', pattern: /top-down inset/i },
  { label: 'matched-camera before and after visualization', pattern: /same camera before and after a supported local import visualization/i },
  { label: 'rack and floor-bin evidence', pattern: /rack positions and floor-bin areas/i },
  { label: 'operational relationship evidence', pattern: /operational relationship/i },
  { label: 'security-boundary diagram caption', pattern: /Supported data boundary\./i },
  { label: 'multisite-build diagram caption', pattern: /reusable facility-build method/i },
  { label: 'inspectable result', pattern: /inspectable/i },
  { label: 'Three.js technology', pattern: /Three\.js/i },
  { label: 'JavaScript technology', pattern: /JavaScript/i },
  { label: 'CSS technology', pattern: /CSS/i },
  { label: 'PWA service worker technology', pattern: /PWA and service worker/i },
  { label: 'Node scripts technology', pattern: /Node build scripts/i },
  { label: 'decision and training boundary', pattern: /simulation and decision\/training aid/i },
  { label: 'optional movement capture boundary', pattern: /optional movement capture/i },
  { label: 'public verification wording', pattern: /public verification surfaces/i }
];

function assertApprovedPpkVisibleContent(text) {
  for (const { label, pattern } of approvedPpkVisibleContent) {
    assert.match(text, pattern, `missing approved PPK visible content: ${label}`);
  }
}

test('PPK076 describes the supported local boundary without exposing inventory records or warehouse-optimization results', async () => {
  const ppk = await readFile(new URL('../projects/ppk076/index.html', import.meta.url), 'utf8');
  const visibleText = ppkVisibleText(ppk);

  assertApprovedPpkVisibleContent(visibleText);

  assertNoPpkVisibleMetrics(visibleText);
  assert.doesNotMatch(visibleText, /(?:material number|storage bin|inventory record)\s*[:|]/i);

  assert.throws(() => assertNoPpkVisibleMetrics(`${visibleText} 176 positions`), /176/);
  assert.throws(() => assertNoPpkVisibleMetrics(`${visibleText} 176/22 bins and 222 positions / 26 bins`), /176, 22, 222, 26/);
  assert.doesNotThrow(() => assertNoPpkVisibleMetrics(`${visibleText} CRC176F4C6E zone22alpha`));
  assert.doesNotThrow(() => assertNoPpkVisibleMetrics(ppkVisibleText(`${ppk}<script>const metric = 176;</script>`)));

  for (const { label, pattern } of approvedPpkVisibleContent.filter(({ label }) => [
    'modeled physical regions',
    'matched-camera before and after visualization',
    'security-boundary diagram caption',
    'multisite-build diagram caption',
    'JavaScript technology',
    'CSS technology'
  ].includes(label))) {
    assert.throws(
      () => assertApprovedPpkVisibleContent(visibleText.replace(pattern, '')),
      new RegExp(label)
    );
  }
});

test('warehouse optimization publishes its verified result without exposing operational identifiers', async () => {
  const warehouse = await readFile(new URL('../projects/warehouse-optimization/index.html', import.meta.url), 'utf8');
  const visibleText = ppkVisibleText(warehouse);

  for (const claim of [
    /176 pallet positions recovered/i,
    /22 storage bins freed/i,
    /Measured before\/after occupancy/i,
    /Human verification remained authoritative/i
  ]) {
    assert.match(visibleText, claim);
  }

  assert.doesNotMatch(
    visibleText,
    /(?:\b222\b|\b26 bins\b|\bWH1\b|\bJ\d{2}\b|warehouse_wh1_bin_map_high_quality\.svg)/i
  );
});

test('warehouse route keeps its complete decision boundary and generic technology disclosure', async () => {
  const warehouse = await readFile(new URL('../projects/warehouse-optimization/index.html', import.meta.url), 'utf8');
  const { expectedHeadings, requiredBoundaryStatements } = assertWarehouseDisclosure(warehouse);

  assert.throws(
    () => assert.deepEqual(
      [...warehouse.replace('Architecture / decisions', 'Architecture').matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
        .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()),
      expectedHeadings
    ),
    /strictly deep-equal/
  );
  assert.throws(
    () => assert.match(warehouse.replace('REWORK-verified', 'verified'), /REWORK-verified/i),
    /REWORK-verified/
  );
  assert.throws(
    () => assertWarehouseDisclosure(warehouse.replace('<li>Verification workflow</li>', '<li>JavaScript</li>')),
    /JavaScript/
  );
  assert.throws(
    () => assertWarehouseDisclosure(warehouse.replace('</ul>', '<li>JavaScript</li></ul>')),
    /JavaScript/
  );
  for (const { label, text } of requiredBoundaryStatements) {
    assert.throws(
      () => assertWarehouseDisclosure(warehouse.replace(text, '')),
      new RegExp(`missing warehouse boundary statement: ${label}`)
    );
  }
  assert.throws(
    () => assertWarehouseDisclosure(warehouse.replace('</main>', '<a href="https://credentials.example.invalid">Credential</a></main>')),
    /must not invent external credential anchors/
  );
  assert.throws(
    () => assertWarehouseDisclosureEntries([{ path: 'projects/warehouse-optimization/mutation.html', content: `${warehouse}\nWH1` }]),
    /sensitive warehouse details/
  );
});

test('homepage publishes only the approved evidence-led claims', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const publicHtml = await Promise.all(publicDocuments.map((document) => readFile(new URL(document, import.meta.url), 'utf8')));

  assert.match(home, /I BUILD SYSTEMS THAT HAVE TO ANSWER TO REALITY\./);
  assert.match(home, /VERIFIED WORK/);
  assert.match(home, /176 pallet positions recovered/i);
  assert.match(home, /22 storage bins freed/i);
  assert.doesNotMatch(publicHtml.join('\n'), /\+?222\b|\b26 (?:storage )?bins\b/i);
  assert.match(home, /313 verification markers/i);
  assert.match(home, /zero drops/i);
  assert.match(home, /176F4C6E/i);
  assert.match(home, /target-specific/i);
});

test('selected PythOS evidence band carries its target-specific metrics', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const pythosBand = home.match(/<article\b[^>]*class=["'][^"']*\bwork-piece--pythos\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? '';

  assert.match(pythosBand, /313 verification markers/i);
  assert.match(pythosBand, /zero drops/i);
  assert.match(pythosBand, /CRC 176F4C6E/i);
  assert.match(pythosBand, /target-specific physical evidence/i);
});
