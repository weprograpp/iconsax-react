const path = require('path');
const fs = require('fs').promises;

const rootDir = path.resolve(__dirname, '..');
const packageName = process.argv[2];
const supportedPackages = new Set(['iconsax-react', 'iconsax-react-native']);

if (!supportedPackages.has(packageName)) {
  throw new Error(
    'Pass a supported package name: iconsax-react or iconsax-react-native.',
  );
}

const packageDir = path.join(rootDir, 'packages', packageName);
const sourceDir = path.join(packageDir, 'src');
const distDir = path.join(packageDir, 'dist');

const copyDeclarations = async (directory = sourceDir) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await copyDeclarations(sourcePath);
    } else if (entry.name.endsWith('.d.ts')) {
      const relativePath = path.relative(sourceDir, sourcePath);
      const destinationPath = path.join(distDir, relativePath);
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.copyFile(sourcePath, destinationPath);
      if (packageName === 'iconsax-react') {
        const declarationBase = destinationPath.slice(0, -'.d.ts'.length);
        await Promise.all([
          fs.copyFile(sourcePath, `${declarationBase}.d.mts`),
          fs.copyFile(sourcePath, `${declarationBase}.d.cts`),
        ]);
      }
    }
  }
};

const main = async () => {
  await copyDeclarations();
  await fs.copyFile(
    path.join(rootDir, 'meta-data.json'),
    path.join(distDir, 'meta-data.json'),
  );
  await Promise.all([
    fs.writeFile(
      path.join(distDir, 'esm', 'package.json'),
      `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
    ),
    fs.writeFile(
      path.join(distDir, 'cjs', 'package.json'),
      `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
    ),
  ]);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
