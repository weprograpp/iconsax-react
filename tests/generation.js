const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const iconsDir = path.join(rootDir, 'icons');
const sourceDir = path.join(rootDir, 'packages', 'iconsax-react', 'src');

const digestTree = (directory) => {
  const files = [];
  const visit = (currentDirectory) => {
    for (const entry of fs
      .readdirSync(currentDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else files.push(entryPath);
    }
  };
  visit(directory);

  return files.map((filePath) => ({
    path: path.relative(directory, filePath),
    hash: crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
  }));
};

const main = () => {
  const iconsBefore = digestTree(iconsDir);
  const sourceBefore = digestTree(sourceDir);
  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, 'scripts', 'build.js'), 'react'],
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );
  if (result.status !== 0) {
    throw new Error(`React generation failed\n${result.stdout}\n${result.stderr}`);
  }

  assert.deepStrictEqual(
    digestTree(iconsDir),
    iconsBefore,
    'React generation changed the canonical SVG source tree.',
  );
  assert.deepStrictEqual(
    digestTree(sourceDir),
    sourceBefore,
    'React generation is not deterministic.',
  );
  console.log('Verified deterministic React generation without SVG source changes.');
};

main();
