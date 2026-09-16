import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  assertWarehouseDisclosureEntries,
  readWarehouseBoundaryEntries
} from './warehouse-boundary.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceRoot = path.join(repositoryRoot, 'assets', 'evidence');
const provenancePath = path.join(evidenceRoot, 'provenance.json');
const execFileAsync = promisify(execFile);

const approvedSources = [
  'ppk076/ppk076_first_person_forklift.png',
  'ppk076/ppk076_inventory_baseline_before_import.png',
  'ppk076/ppk076_inventory_populated_after_import.png',
  'ppk076/ppk076_geometry_wireframe.png',
  'ppk076/ppk076_full_facility_oblique.png',
  'ppk076/ppk076_topdown_facility.png',
  'ppk076/ppk076_rack_floor_bin_detail.png',
  'ppk076/ppk076_operational_relationship.png',
  'ppk076/ppk076_data_security_boundary.png',
  'ppk076/ppk076_multisite_build_method.png',
  'generated/warehouse-optimization-verified-result.png',
  'generated/skill-evaluation-lab-evidence-map.png',
  'workspace/workspace_m2a_room_checkpoint.png',
  'pythos/pythos_physical_evidence_terminal.jpg',
  'pythos/pythos_public_evidence_map.jpg',
  'pythos/pythos_claim_boundary.jpg',
  'generated/pythos-architecture-evidence-boundary.png'
];

async function readProvenance() {
  return JSON.parse(await readFile(provenancePath, 'utf8'));
}

function largestApertureRecords(records) {
  return records.filter(({ roles }) => roles.some((role) => role.startsWith('aperture')));
}

function mobileRecords(records) {
  return records.filter(({ widths }) => widths.includes(640) || widths.includes(720));
}

async function assertWithinBudget(record, width, budget) {
  for (const extension of ['avif', 'webp']) {
    const output = path.join(repositoryRoot, `${record.outputStem}-${width}w.${extension}`);
    const bytes = (await stat(output)).size;
    const exception = record.budgetException?.[`${width}w.${extension}`];
    assert.ok(
      bytes <= budget || (exception && exception.measuredBytes === bytes && exception.rationale),
      `${output} exceeds its ${budget}-byte budget without a documented exception`
    );
  }
}

test('evidence provenance records are public-safe, complete, and approved', async () => {
  const records = await readProvenance();

  assert.equal(records.length, 17);
  assert.deepEqual(records.map(({ source }) => source).sort(), [...approvedSources].sort());

  for (const record of records) {
    assert.match(record.source, /^(ppk076|generated|workspace|pythos)\//);
    for (const field of ['original', 'outputStem', 'project', 'roles', 'disclosure', 'alt']) {
      assert.ok(record[field], `${record.source} must have a non-empty ${field}`);
    }
    assert.ok(Array.isArray(record.roles) && record.roles.length > 0, `${record.source} must have at least one role`);
    assert.match(record.alt, /\s/, `${record.source} alt text must explain the evidence, not repeat a filename`);
    assert.notEqual(record.alt.toLowerCase(), path.basename(record.source).toLowerCase());
    assert.ok(record.widths.every((width) => width <= record.sourceWidth), `${record.source} must not upscale`);
  }
});

test('excluded raw warehouse bin map is neither registered nor copied', async () => {
  const records = await readProvenance();
  const excludedSource = 'warehouse/warehouse_wh1_bin_map_high_quality.svg';

  assert.equal(records.some(({ source }) => source === excludedSource), false);
  await assert.rejects(access(path.join(repositoryRoot, excludedSource)));
  await assert.rejects(access(path.join(evidenceRoot, 'original', excludedSource)));
});

test('warehouse route consumes only the declared public-safe result visual', async () => {
  const [records, warehouse] = await Promise.all([
    readProvenance(),
    readFile(new URL('../projects/warehouse-optimization/index.html', import.meta.url), 'utf8')
  ]);
  const visual = records.find(({ outputStem }) => outputStem === 'assets/evidence/optimized/warehouse/warehouse-optimization-verified-result');

  assert.equal(visual?.disclosure, 'public-safe generated abstraction');
  assert.deepEqual(visual?.roles, ['aperture', 'warehouse hero', 'verified work']);
  assert.match(warehouse, /\/assets\/evidence\/optimized\/warehouse\/warehouse-optimization-verified-result-1800w\.webp/i);
});

test('warehouse source and built boundaries centrally reject restricted disclosure, sensitive details, and SVGs', async () => {
  await execFileAsync(process.execPath, ['scripts/build.mjs'], { cwd: repositoryRoot });
  const [sourceEntries, builtEntries] = await Promise.all([
    readWarehouseBoundaryEntries(repositoryRoot),
    readWarehouseBoundaryEntries(repositoryRoot, { built: true })
  ]);
  const builtWarehouse = await readFile(path.join(repositoryRoot, 'dist', 'projects', 'warehouse-optimization', 'index.html'), 'utf8');
  const outputPaths = [...builtWarehouse.matchAll(/\/assets\/evidence\/optimized\/warehouse\/warehouse-optimization-verified-result-(?:720|1200|1800)w\.(?:avif|webp)/g)]
    .map((match) => match[0])
    .sort();
  const expectedPaths = [
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-720w.avif',
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-720w.webp',
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-1200w.avif',
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-1200w.webp',
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-1800w.avif',
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-1800w.webp'
  ].sort();

  assertWarehouseDisclosureEntries(sourceEntries);
  assertWarehouseDisclosureEntries(builtEntries);
  assert.deepEqual([...new Set(outputPaths)], expectedPaths);
  assert.throws(
    () => assert.deepEqual(
      [...new Set([...builtWarehouse.replaceAll('1800w.webp', '1600w.webp').matchAll(/\/assets\/evidence\/optimized\/warehouse\/warehouse-optimization-verified-result-(?:720|1200|1800)w\.(?:avif|webp)/g)]
        .map((match) => match[0])
        .sort())],
      expectedPaths
    ),
    /strictly deep-equal/
  );

  for (const restrictedCount of ['222', '+222', '26', '+26', '26 positions', '26 bins']) {
    assert.throws(
      () => assertWarehouseDisclosureEntries([...sourceEntries, { path: 'projects/warehouse-optimization/mutation.html', content: restrictedCount }]),
      /restricted warehouse counts/
    );
  }
  for (const permittedNumber of ['1222', '226', 'warehouse26alpha']) {
    assert.doesNotThrow(
      () => assertWarehouseDisclosureEntries([...sourceEntries, { path: 'projects/warehouse-optimization/permitted.html', content: permittedNumber }])
    );
  }
  for (const sensitiveDetail of [
    'raw SAP records',
    'raw records',
    'confidential roster',
    'confidential data',
    'facility address',
    'facility identifier',
    'facility label',
    'internal label',
    'internal record',
    'operator name',
    'employee ID',
    'personnel name',
    'personnel email',
    'personnel ID',
    'internal bin ID',
    'J01',
    'material number: 12345',
    'inventory record: ABC',
    'credential',
    'API key',
    'secret',
    'token',
    'password'
  ]) {
    assert.throws(
      () => assertWarehouseDisclosureEntries([...sourceEntries, { path: 'projects/warehouse-optimization/mutation.html', content: sensitiveDetail }]),
      /sensitive warehouse details/
    );
  }
  assert.throws(
    () => assertWarehouseDisclosureEntries([...sourceEntries, { path: 'assets/css/projects/warehouse.css', content: '.warehouse-result { background-image: url("/assets/evidence/raw.svg"); }' }]),
    /must not reference SVG evidence/
  );
  assert.throws(
    () => assertWarehouseDisclosureEntries([...sourceEntries, { path: 'assets/evidence/optimized/warehouse/copied-raw.svg' }]),
    /must not be an SVG file/
  );
});

test('all declared responsive variants exist after asset generation', async () => {
  const records = await readProvenance();

  for (const { outputStem, widths } of records) {
    for (const width of widths) {
      for (const extension of ['avif', 'webp']) {
        const output = path.join(repositoryRoot, `${outputStem}-${width}w.${extension}`);
        assert.ok((await stat(output)).size > 0, `${output} must be non-empty`);
      }
    }
  }
});

test('budget selectors include every declared aperture and mobile evidence category', async () => {
  const records = await readProvenance();

  assert.deepEqual(
    largestApertureRecords(records).map(({ source }) => source).sort(),
    [
      'ppk076/ppk076_first_person_forklift.png',
      'ppk076/ppk076_inventory_baseline_before_import.png',
      'ppk076/ppk076_inventory_populated_after_import.png',
      'generated/warehouse-optimization-verified-result.png',
      'generated/skill-evaluation-lab-evidence-map.png',
      'workspace/workspace_m2a_room_checkpoint.png',
      'pythos/pythos_physical_evidence_terminal.jpg',
      'generated/pythos-architecture-evidence-boundary.png'
    ].sort()
  );
  assert.deepEqual(
    mobileRecords(records).map(({ source }) => source).sort(),
    approvedSources.filter((source) => !source.includes('pythos_public_evidence_map') && !source.includes('pythos_claim_boundary')).sort()
  );
});

test('responsive evidence image budgets remain public-web appropriate', async () => {
  const records = await readProvenance();

  for (const record of largestApertureRecords(records)) {
    const largestWidth = Math.max(...record.widths);
    await assertWithinBudget(record, largestWidth, 450 * 1024);
  }

  for (const record of mobileRecords(records)) {
    for (const width of record.widths.filter((width) => width === 640 || width === 720)) {
      await assertWithinBudget(record, width, 180 * 1024);
    }
  }
});
