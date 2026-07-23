const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'iconsax-react');
const reactVersion = process.argv[2];
const supportedVersions = new Set(['16.14.0', '17.0.2', '18.3.1', '19.0.0']);

if (!supportedVersions.has(reactVersion)) {
  throw new Error(
    `Pass a supported React smoke-test version: ${[...supportedVersions].join(', ')}`,
  );
}

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
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iconsax-react-smoke-'));
  const packResult = run(
    'npm',
    ['pack', packageDir, '--json', '--pack-destination', fixtureDir],
    { cwd: rootDir },
  );
  const tarball = path.join(fixtureDir, JSON.parse(packResult.stdout)[0].filename);

  fs.writeFileSync(
    path.join(fixtureDir, 'package.json'),
    `${JSON.stringify({ private: true }, null, 2)}\n`,
  );
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      `react@${reactVersion}`,
      `react-dom@${reactVersion}`,
      tarball,
    ],
    { cwd: fixtureDir },
  );

  const smoke = `
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { EmojiHappy: RootIcon } = require('iconsax-react');
    const { EmojiHappy: DynamicIcon } = require('iconsax-react/icons/EmojiHappy');
    const { EmojiHappy: FixedIcon } = require('iconsax-react/linear/EmojiHappy');
    for (const Component of [RootIcon, DynamicIcon, FixedIcon]) {
      const markup = renderToStaticMarkup(React.createElement(Component, { color: 'red' }));
      if (!markup.includes('<svg') || !markup.includes('red')) process.exit(1);
    }
  `;
  run(process.execPath, ['--eval', smoke], { cwd: fixtureDir });
  console.log(`Verified packed package with React ${reactVersion}.`);
};

main();
