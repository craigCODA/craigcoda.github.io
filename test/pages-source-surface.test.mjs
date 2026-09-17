import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auditScript = path.join(repositoryRoot, 'scripts', 'audit-pages-source.mjs');

async function createTrackedFixture(context, entries) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-pages-source-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await execFileAsync('git', ['init', '--quiet', root]);
  for (const [relativePath, content] of Object.entries(entries)) {
    const file = path.join(root, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  await execFileAsync('git', ['-C', root, 'add', '--all']);
  return root;
}

async function runAudit(root) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [auditScript, root]);
    return { code: 0, stderr, stdout };
  } catch (error) {
    return { code: error.code, stderr: error.stderr ?? '', stdout: error.stdout ?? '' };
  }
}

test('legacy Pages source audit rejects an unclassified tracked path', async (context) => {
  const root = await createTrackedFixture(context, { 'notes/private.txt': 'not inventoried' });
  const result = await runAudit(root);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /notes\/private\.txt: tracked path is not classified for legacy Pages/);
});

test('legacy Pages source audit rejects synthetic unapproved warehouse claims in a classified development file', async (context) => {
  const syntheticPositionCount = 900_003;
  const syntheticBinCount = 800_002;
  const restrictedClaims = [
    `Synthetic warehouse result: ${syntheticPositionCount} pallet positions recovered.`,
    `Synthetic warehouse result: ${syntheticBinCount} storage bins freed.`,
    `Synthetic warehouse result: ${syntheticPositionCount} / ${syntheticBinCount}.`,
    `Pallet positions recovered: ${syntheticPositionCount}.`,
    `Storage bins freed: ${syntheticBinCount}.`,
    `Historical result: ${syntheticPositionCount} / ${syntheticBinCount}.`,
    `Synthetic claim: ${syntheticPositionCount} and ${syntheticBinCount}.`,
    `Pallet positions recovered were ${syntheticPositionCount}.`,
    `Storage bins freed were ${syntheticBinCount}.`,
    `${900_024} pallet positions.`,
    `${800_025} bins.`,
    `Recovered pallet positions: ${900_026}.`,
    `Freed storage bins: ${800_027}.`
  ];

  for (const restrictedClaim of restrictedClaims) {
    const root = await createTrackedFixture(context, { 'README.md': restrictedClaim });
    const result = await runAudit(root);

    assert.equal(result.code, 1, result.stderr);
    assert.match(result.stderr, /README\.md: restricted warehouse counts/);
  }
});

test('legacy Pages source audit permits only the approved public warehouse result phrases', async (context) => {
  const root = await createTrackedFixture(context, {
    'README.md': 'Verified result: 176   PALLET POSITIONS RECOVERED and 22 storage bins freed.'
  });
  const result = await runAudit(root);

  assert.equal(result.code, 0, result.stderr);
});

test('legacy Pages source audit rejects an unsafe file type inside a classified tree', async (context) => {
  const root = await createTrackedFixture(context, {
    'assets/evidence/original/ppk076/source-project.psd': Buffer.from([0, 1, 2, 3])
  });
  const result = await runAudit(root);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /assets\/evidence\/original\/ppk076\/source-project\.psd: unsafe file type for legacy Pages/);
});

test('legacy Pages source audit permits legitimate credential-boundary prose', async (context) => {
  const root = await createTrackedFixture(context, {
    'README.md': 'Application credentials remain under host-controlled authority.'
  });
  const result = await runAudit(root);

  assert.equal(result.code, 0, result.stderr);
});

test('legacy Pages source audit rejects value-bearing secret assignments in development files', async (context) => {
  const assignmentNames = [
    'credential',
    ['api', 'key'].join('_'),
    'secret',
    'password',
    'token'
  ];
  const fixtures = assignmentNames.map((assignmentName) => ({
    label: assignmentName,
    content: `${assignmentName} = "publicly-exposed-value"`
  }));
  const inlineKey = ['api', 'Key'].join('');
  fixtures.push({
    label: 'inline JavaScript API key',
    content: `const ${inlineKey} = "publicly-exposed-value";`
  });

  for (const { label, content } of fixtures) {
    const root = await createTrackedFixture(context, {
      'README.md': content
    });
    const result = await runAudit(root);

    assert.equal(result.code, 1, `${label}: ${result.stderr}`);
    assert.match(result.stderr, /README\.md: sensitive credential assignment/);
  }
});

test('legacy Pages source audit rejects compound value-bearing secret assignments', async (context) => {
  const identifierParts = [
    ['client', 'Secret'],
    ['access', 'Token'],
    ['db', 'Password'],
    ['service', 'Credential']
  ];
  const separators = ['', '_', '-'];

  for (const [prefix, suffix] of identifierParts) {
    for (const separator of separators) {
      const identifier = separator
        ? [prefix, suffix.toLowerCase()].join(separator)
        : [prefix, suffix].join('');
      const root = await createTrackedFixture(context, {
        'README.md': `${identifier} = "publicly-exposed-value"`
      });
      const result = await runAudit(root);

      assert.equal(result.code, 1, `${identifier}: ${result.stderr}`);
      assert.match(result.stderr, /README\.md: sensitive credential assignment/);
    }
  }
});

test('legacy Pages source audit rejects generic sensitive-suffix assignments', async (context) => {
  const identifiers = [
    ['refresh', 'Token'].join(''),
    ['auth', 'Token'].join(''),
    ['signing', 'Secret'].join(''),
    ['database', 'Password'].join(''),
    ['release', 'Credential'].join(''),
    ['primary', 'Api', 'Key'].join(''),
    ['Refresh', 'Token'].join(''),
    ['refresh', 'token'].join('_'),
    ['signing', 'secret'].join('-')
  ];
  const exposedValue = ['publicly', 'exposed', 'value'].join('-');
  const accepted = [];

  for (const identifier of identifiers) {
    const root = await createTrackedFixture(context, {
      'README.md': `${identifier} = ${JSON.stringify(exposedValue)}`
    });
    const result = await runAudit(root);

    if (result.code !== 1 || !/README\.md: sensitive credential assignment/.test(result.stderr)) {
      accepted.push(identifier);
    }
  }

  assert.deepEqual(accepted, []);
});

test('legacy Pages source audit rejects safe references combined with literal assigned content', async (context) => {
  const environmentReference = ['process', 'env', 'NAME'].join('.');
  const interpolationReference = '$' + '{' + 'NAME' + '}';
  const literalValue = JSON.stringify(['literal', 'value'].join('-'));
  const fixtures = [
    {
      identifier: ['refresh', 'Token'].join(''),
      expression: `${environmentReference} || ${literalValue}`
    },
    {
      identifier: ['access', 'Token'].join(''),
      expression: `${environmentReference} || ${literalValue}`
    },
    {
      identifier: ['auth', 'Token'].join(''),
      expression: `${interpolationReference}-${['literal', 'suffix'].join('-')}`
    }
  ];
  const accepted = [];

  for (const { identifier, expression } of fixtures) {
    const root = await createTrackedFixture(context, {
      'README.md': `${identifier} = ${expression}`
    });
    const result = await runAudit(root);

    if (result.code !== 1 || !/README\.md: sensitive credential assignment/.test(result.stderr)) {
      accepted.push(identifier);
    }
  }

  assert.deepEqual(accepted, []);
});

test('legacy Pages source audit rejects a synthetic unapproved positions-recovered claim without a pallet qualifier', async (context) => {
  const syntheticClaim = `${900_003} positions recovered`;
  const root = await createTrackedFixture(context, {
    'README.md': `Synthetic warehouse result: ${syntheticClaim}.`
  });
  const result = await runAudit(root);

  assert.equal(result.code, 1, result.stderr);
  assert.match(result.stderr, /README\.md: restricted warehouse counts/);
});

test('legacy Pages source audit rejects reconstructed warehouse disclosure constants', async (context) => {
  const reconstructedCountName = ['historical', 'Warehouse', 'Positions'].join('');
  const reconstructedMapName = ['excluded', 'Warehouse', 'Map'].join('');
  const fixtures = [
    `const ${reconstructedCountName} = ${450_000} * 2;`,
    `const ${reconstructedMapName} = ['warehouse', '_synthetic-zone-', ${900_004}, '.svg'].join('');`
  ];

  for (const content of fixtures) {
    const root = await createTrackedFixture(context, { 'README.md': content });
    const result = await runAudit(root);

    assert.equal(result.code, 1, result.stderr);
    assert.match(result.stderr, /README\.md: warehouse disclosure reconstruction/);
  }
});

test('legacy Pages source audit permits design-token terminology in development prose', async (context) => {
  const helperIdentifier = ['rel', 'Tokens'].join('');
  const root = await createTrackedFixture(context, {
    'README.md': `The visual system uses restrained design tokens.\nconst ${helperIdentifier} = new Set();`
  });
  const result = await runAudit(root);

  assert.equal(result.code, 0, result.stderr);
});

test('legacy Pages source audit permits generic SVG test syntax in development files', async (context) => {
  const root = await createTrackedFixture(context, {
    'test/warehouse-boundary.mjs': "const genericVectorExtension = '.svg';"
  });
  const result = await runAudit(root);

  assert.equal(result.code, 0, result.stderr);
});

test('legacy Pages source audit does not treat CSS position properties as warehouse claims', async (context) => {
  const root = await createTrackedFixture(context, {
    'assets/css/aperture.css': '.evidence { object-position: 18% center; }'
  });
  const result = await runAudit(root);

  assert.equal(result.code, 0, result.stderr);
});

test('legacy Pages source audit rejects an internal warehouse label in development text', async (context) => {
  const internalLabel = `J${900_005}`;
  const root = await createTrackedFixture(context, {
    'README.md': `Do not disclose internal warehouse location ${internalLabel}.`
  });
  const result = await runAudit(root);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /README\.md: sensitive warehouse details/);
});

test('legacy Pages source audit rejects lowercase internal warehouse labels', async (context) => {
  const internalLabels = [
    `j${900_006}`,
    `wh${900_007}`
  ];

  for (const internalLabel of internalLabels) {
    const root = await createTrackedFixture(context, {
      'README.md': `Do not disclose internal warehouse location ${internalLabel}.`
    });
    const result = await runAudit(root);

    assert.equal(result.code, 1, `${internalLabel}: ${result.stderr}`);
    assert.match(result.stderr, /README\.md: sensitive warehouse details/);
  }
});

test('legacy Pages source audit rejects generic warehouse labels delimited by underscores', async (context) => {
  const embeddedLabels = [
    ['location', `j${900_008}`].join('_'),
    ['warehouse', `wh${900_009}`, 'record'].join('_')
  ];
  const quotedLabel = `_wh${900_010}`;
  const fixtures = [
    ...embeddedLabels.map((label) => `Do not disclose internal warehouse location ${label}.`),
    `const location = ${JSON.stringify(quotedLabel)};`,
    `const location = '${quotedLabel}';`
  ];
  const accepted = [];

  for (const content of fixtures) {
    const root = await createTrackedFixture(context, {
      'README.md': content
    });
    const result = await runAudit(root);

    if (result.code !== 1 || !/README\.md: sensitive warehouse details/.test(result.stderr)) {
      accepted.push(content);
    }
  }

  assert.deepEqual(accepted, []);
});

test('legacy Pages source audit permits unrelated technical identifiers', async (context) => {
  const identifiers = ['C99', 'A11', 'P13', 'x86-64'];

  for (const identifier of identifiers) {
    const root = await createTrackedFixture(context, {
      'README.md': `Unrelated technical identifier: ${identifier}.`
    });
    const result = await runAudit(root);

    assert.equal(result.code, 0, `${identifier}: ${result.stderr}`);
  }
});

test('legacy Pages source audit permits non-value secret references and placeholders', async (context) => {
  const environmentReference = ['process', 'env', 'NAME'].join('.');
  const interpolationReference = '$' + '{' + 'NAME' + '}';
  const actionsReference = '$' + '{{ ' + ['secrets', 'NAME'].join('.') + ' }}';
  const fixtures = [
    ['secret', environmentReference],
    ['token', interpolationReference],
    ['password', actionsReference],
    ['credential', '__PLACEHOLDER__'],
    ['secret', `${environmentReference} // host-provided reference`],
    ['token', `${interpolationReference} # deployment reference`],
    ['password', `${actionsReference} # GitHub Actions reference`]
  ];

  for (const [identifier, reference] of fixtures) {
    const root = await createTrackedFixture(context, {
      'README.md': `${identifier} = ${reference}`
    });
    const result = await runAudit(root);

    assert.equal(result.code, 0, `${reference}: ${result.stderr}`);
  }
});

test('legacy Pages source audit permits an unrelated development semantic version', async (context) => {
  const version = '1.0.42';
  const root = await createTrackedFixture(context, {
    'README.md': `Current development package version: ${version}.`
  });
  const result = await runAudit(root);

  assert.equal(result.code, 0, result.stderr);
});

test('legacy Pages source audit accepts the complete repository inventory', async () => {
  const result = await runAudit(repositoryRoot);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Pages source audit passed: \d+ tracked files \(\d+ runtime, \d+ development\)\./);
});

test('npm audit:source command runs the repository publication-surface gate', async () => {
  const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm', 'run', 'audit:source']
    : ['run', 'audit:source'];
  const { stdout } = await execFileAsync(command, args, { cwd: repositoryRoot });

  assert.match(stdout, /Pages source audit passed: \d+ tracked files \(\d+ runtime, \d+ development\)\./);
});
