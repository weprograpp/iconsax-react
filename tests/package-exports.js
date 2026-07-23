const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'iconsax-react');
const typescriptBin = require.resolve('typescript/bin/tsc', {
  paths: [packageDir],
});

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: {
      ...process.env,
      npm_config_cache: path.join(os.tmpdir(), 'iconsax-npm-cache'),
      ...options.env,
    },
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result;
};

const main = () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iconsax-exports-'));
  const nodeModulesDir = path.join(fixtureDir, 'node_modules');
  fs.mkdirSync(nodeModulesDir);
  const packResult = run(
    'npm',
    ['pack', packageDir, '--json', '--pack-destination', fixtureDir],
    { cwd: rootDir },
  );
  const tarball = path.join(
    fixtureDir,
    JSON.parse(packResult.stdout)[0].filename,
  );
  const installedPackageDir = path.join(nodeModulesDir, 'iconsax-react');
  fs.mkdirSync(installedPackageDir);
  run(
    'tar',
    ['-xzf', tarball, '--strip-components=1', '-C', installedPackageDir],
    { cwd: fixtureDir },
  );
  fs.symlinkSync(
    path.join(rootDir, 'node_modules', 'react'),
    path.join(nodeModulesDir, 'react'),
    'dir',
  );
  const fixtureTypesDir = path.join(nodeModulesDir, '@types');
  fs.mkdirSync(fixtureTypesDir);
  for (const typePackage of ['prop-types', 'react', 'scheduler']) {
    fs.symlinkSync(
      path.join(rootDir, 'node_modules', '@types', typePackage),
      path.join(fixtureTypesDir, typePackage),
      'dir',
    );
  }
  fs.symlinkSync(
    path.join(rootDir, 'node_modules', 'csstype'),
    path.join(nodeModulesDir, 'csstype'),
    'dir',
  );

  const commonJs = `
    const root = require('iconsax-react');
    const dynamic = require('iconsax-react/icons/EmojiHappy');
    const fixed = require('iconsax-react/linear/EmojiHappy');
    const legacy = require('iconsax-react/dist/cjs/EmojiHappy.js');
    const legacyExtensionless = require('iconsax-react/dist/cjs/EmojiHappy');
    const metadata = require('iconsax-react/dist/meta-data.json');
    if (!root.EmojiHappy || !dynamic.EmojiHappy || !fixed.EmojiHappy) process.exit(1);
    if (legacy.EmojiHappy !== dynamic.EmojiHappy) process.exit(2);
    if (legacyExtensionless.EmojiHappy !== dynamic.EmojiHappy) process.exit(3);
    if (metadata.categories.length === 0) process.exit(4);
  `;
  run(process.execPath, ['--eval', commonJs], { cwd: fixtureDir });

  const esmPath = path.join(fixtureDir, 'consumer.mjs');
  fs.writeFileSync(
    esmPath,
    `
      import { EmojiHappy as RootIcon } from 'iconsax-react';
      import DynamicIcon, { EmojiHappy as DynamicIconNamed } from 'iconsax-react/icons/EmojiHappy';
      import FixedIcon, { EmojiHappy as FixedIconNamed } from 'iconsax-react/twotone/EmojiHappy';
      if (!RootIcon || DynamicIcon !== DynamicIconNamed || FixedIcon !== FixedIconNamed) process.exit(1);
    `,
  );
  run(process.execPath, [esmPath], { cwd: fixtureDir });

  fs.writeFileSync(
    path.join(fixtureDir, 'consumer.ts'),
    `
      import DynamicIcon, { EmojiHappy as DynamicNamed } from 'iconsax-react/icons/EmojiHappy';
      import FixedIcon, { EmojiHappy as FixedNamed } from 'iconsax-react/linear/EmojiHappy';
      import type { IconProps, FixedIconProps } from 'iconsax-react';

      const dynamicProps: IconProps = { variant: 'Bulk', color: 'red', size: 32 };
      const fixedProps: FixedIconProps = { color: 'blue', size: '2em' };
      // @ts-expect-error fixed icons deliberately reject the runtime variant prop
      const invalidFixedProps: FixedIconProps = { variant: 'Bold' };

      void DynamicIcon;
      void DynamicNamed;
      void FixedIcon;
      void FixedNamed;
      void dynamicProps;
      void fixedProps;
      void invalidFixedProps;
    `,
  );
  fs.writeFileSync(
    path.join(fixtureDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          lib: ['ES2020', 'DOM'],
          module: 'Node16',
          moduleResolution: 'Node16',
          noEmit: true,
          strict: true,
          skipLibCheck: false,
        },
        include: ['consumer.ts'],
      },
      null,
      2,
    ),
  );
  run(process.execPath, [typescriptBin, '-p', 'tsconfig.json'], {
    cwd: fixtureDir,
  });

  console.log(
    'Verified packed CommonJS, ESM, legacy dist paths, metadata, and TypeScript exports.',
  );
};

main();
