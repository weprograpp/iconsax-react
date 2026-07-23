const cc = require('camelcase');
const path = require('path');
const fs = require('fs').promises;
const fetchIcon = require('./fetchIcon');
const generateIcons = require('./generateIcons');

const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');
const packageTargets = {
  react: 'iconsax-react',
  'react-native': 'iconsax-react-native',
};

const toComponentName = (filename) => {
  const name = cc(filename.replace('.svg', ''), { pascalCase: true });
  return /^\d/.test(name) ? `I${name}` : name;
};

const requestedTargets = process.argv.slice(2);
const targets = requestedTargets.length
  ? requestedTargets
  : Object.keys(packageTargets);

for (const target of targets) {
  if (!packageTargets[target]) {
    throw new Error(
      `Unknown generation target "${target}". Expected react or react-native.`,
    );
  }
}

const main = async () => {
  const icons = fetchIcon(rootDir);
  const categories = icons.categories.map((category) => ({
    ...category,
    icons: category.icons.map(toComponentName),
  }));

  await fs.writeFile(
    path.join(rootDir, 'meta-data.json'),
    JSON.stringify({ variants: icons.variants, categories }),
    'utf8',
  );

  for (const target of targets) {
    const sourceDir = path.join(packagesDir, packageTargets[target], 'src');
    await fs.rm(sourceDir, { recursive: true, force: true });
    await fs.mkdir(sourceDir, { recursive: true });
    await generateIcons[target](icons);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
