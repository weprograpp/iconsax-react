const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const esbuild = require('esbuild');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'iconsax-react');
const baselinePath = path.join(rootDir, 'benchmarks', 'baseline.json');
const cases = [
  ['EmojiHappy', 'linear'],
  ['ShieldSecurity', 'outline'],
  ['Heart', 'broken'],
  ['Bitcoin', 'bold'],
  ['Gallery', 'bulk'],
  ['Cloud', 'twotone'],
];

const bundle = async (contents, minify) => {
  const result = await esbuild.build({
    stdin: {
      contents,
      loader: 'js',
      resolveDir: rootDir,
    },
    bundle: true,
    external: ['react'],
    format: 'esm',
    metafile: true,
    minify,
    platform: 'browser',
    preserveSymlinks: true,
    treeShaking: true,
    write: false,
  });
  const code = result.outputFiles[0].contents;
  const outputMetadata = Object.values(result.metafile.outputs)[0];
  return {
    bytes: code.length,
    gzip: zlib.gzipSync(code, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(code).length,
    inputs: Object.entries(outputMetadata.inputs)
      .filter(([, contribution]) => contribution.bytesInOutput > 0)
      .map(([input]) => input),
  };
};

const measure = async (contents) => {
  const [raw, minified] = await Promise.all([
    bundle(contents, false),
    bundle(contents, true),
  ]);
  return {
    raw: raw.bytes,
    minified: minified.bytes,
    gzip: minified.gzip,
    brotli: minified.brotli,
    inputs: minified.inputs,
  };
};

const pack = (directory, destination) => {
  const result = spawnSync(
    'npm',
    ['pack', directory, '--json', '--pack-destination', destination],
    {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        npm_config_cache: path.join(os.tmpdir(), 'iconsax-npm-cache'),
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(`npm pack failed\n${result.stdout}\n${result.stderr}`);
  }
  return JSON.parse(result.stdout)[0];
};

const main = async () => {
  const report = { legacy: {}, current: {}, fixed: {} };

  for (const [icon, variantPath] of cases) {
    const legacySource = `import { ${icon} } from 'iconsax-react-legacy'; console.log(${icon});`;
    const dynamicSource = `import { ${icon} } from 'iconsax-react/icons/${icon}'; console.log(${icon});`;
    const fixedSource = `import { ${icon} } from 'iconsax-react/${variantPath}/${icon}'; console.log(${icon});`;

    report.legacy[icon] = await measure(legacySource);
    report.current[icon] = await measure(dynamicSource);
    report.fixed[`${variantPath}/${icon}`] = await measure(fixedSource);

    assert(
      report.current[icon].gzip <= report.legacy[icon].gzip,
      `${icon} dynamic import regressed: ${report.current[icon].gzip} > ${report.legacy[icon].gzip} gzip bytes`,
    );
    assert(
      report.fixed[`${variantPath}/${icon}`].gzip <=
        report.legacy[icon].gzip * 0.6,
      `${variantPath}/${icon} is not at least 40% smaller than the legacy dynamic icon`,
    );
  }

  const rootImport = await measure(
    `import { EmojiHappy } from 'iconsax-react'; console.log(EmojiHappy);`,
  );
  const leafImport = report.current.EmojiHappy;
  report.root = rootImport;
  assert(
    rootImport.gzip <= Math.ceil(leafImport.gzip * 1.01),
    `Root named import exceeds the individual dynamic import by more than 1%`,
  );
  const unrelatedInputs = rootImport.inputs.filter(
    (input) =>
      /[/\\]dist[/\\]esm[/\\][^/\\]+\.js$/.test(input) &&
      !input.endsWith('/EmojiHappy.js') &&
      !input.endsWith('/index.js'),
  );
  assert.deepStrictEqual(
    unrelatedInputs,
    [],
    `Root tree shaking retained unrelated icons: ${unrelatedInputs.join(', ')}`,
  );

  const names = cases.map(([icon]) => icon);
  const legacyMulti = await measure(
    `import { ${names.join(', ')} } from 'iconsax-react-legacy'; console.log(${names.join(', ')});`,
  );
  const fixedImports = cases
    .map(
      ([icon, variantPath]) =>
        `import { ${icon} } from 'iconsax-react/${variantPath}/${icon}';`,
    )
    .join('\n');
  const fixedMulti = await measure(
    `${fixedImports}\nconsole.log(${names.join(', ')});`,
  );
  report.multi = {
    legacy: legacyMulti,
    fixed: fixedMulti,
  };
  assert(
    fixedMulti.gzip <= legacyMulti.gzip * 0.6,
    `Multi-icon fixed bundle is not at least 40% smaller (${fixedMulti.gzip} vs ${legacyMulti.gzip})`,
  );

  const packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iconsax-pack-'));
  const legacyPackageDir = path.dirname(
    require.resolve('iconsax-react-legacy/package.json'),
  );
  const currentPack = pack(packageDir, packDir);
  const legacyPack = pack(legacyPackageDir, packDir);
  report.package = {
    legacy: {
      compressed: legacyPack.size,
      unpacked: legacyPack.unpackedSize,
    },
    current: {
      compressed: currentPack.size,
      unpacked: currentPack.unpackedSize,
    },
  };
  assert(
    currentPack.unpackedSize <= legacyPack.unpackedSize * 1.1,
    `Unpacked package grew by more than 10% (${currentPack.unpackedSize} vs ${legacyPack.unpackedSize})`,
  );

  const compactReport = JSON.parse(
    JSON.stringify(report, (key, value) => (key === 'inputs' ? undefined : value)),
  );
  console.log(JSON.stringify(compactReport, null, 2));

  if (fs.existsSync(baselinePath)) {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    assert.strictEqual(
      baseline.packageVersion,
      '0.0.8',
      'Bundle baseline must describe iconsax-react@0.0.8.',
    );
    assert.strictEqual(
      baseline.tooling.bundler,
      `esbuild@${require('esbuild/package.json').version}`,
      'The recorded baseline must use the esbuild version in the lockfile.',
    );
    assert.deepStrictEqual(
      compactReport.legacy,
      baseline.legacy,
      'The locked iconsax-react@0.0.8 one-icon baseline changed.',
    );
    assert.deepStrictEqual(
      compactReport.multi.legacy,
      baseline.legacyMulti,
      'The locked iconsax-react@0.0.8 multi-icon baseline changed.',
    );
    assert.deepStrictEqual(
      compactReport.package.legacy,
      baseline.legacyPackage,
      'The locked iconsax-react@0.0.8 package baseline changed.',
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
