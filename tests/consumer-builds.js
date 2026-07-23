const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vite = require('vite');
const webpack = require('webpack');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'iconsax-react');

const buildWithWebpack = (config) =>
  new Promise((resolve, reject) => {
    webpack(config, (error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      if (stats.hasErrors()) {
        reject(new Error(stats.toString({ all: false, errors: true })));
        return;
      }
      resolve(stats);
    });
  });

const main = async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iconsax-builds-'));
  const nodeModulesDir = path.join(fixtureDir, 'node_modules');
  const entryPath = path.join(fixtureDir, 'entry.js');
  fs.mkdirSync(nodeModulesDir);
  fs.symlinkSync(packageDir, path.join(nodeModulesDir, 'iconsax-react'), 'dir');
  fs.writeFileSync(
    entryPath,
    `
      import { EmojiHappy } from 'iconsax-react/linear/EmojiHappy';
      export default EmojiHappy;
    `,
  );

  const viteResult = await vite.build({
    configFile: false,
    root: fixtureDir,
    logLevel: 'silent',
    build: {
      write: false,
      minify: 'esbuild',
      lib: {
        entry: entryPath,
        formats: ['es'],
        name: 'IconsaxFixture',
      },
      rollupOptions: {
        external: ['react'],
      },
    },
  });
  const viteOutputs = Array.isArray(viteResult)
    ? viteResult.flatMap((result) => result.output)
    : viteResult.output;
  const viteChunk = viteOutputs.find((output) => output.type === 'chunk');
  assert(viteChunk);
  assert(!viteChunk.code.includes('NotARealVariant'));

  const webpackOutput = path.join(fixtureDir, 'webpack');
  await buildWithWebpack({
    mode: 'production',
    entry: entryPath,
    output: {
      path: webpackOutput,
      filename: 'bundle.js',
      library: { type: 'commonjs2' },
    },
    externals: {
      react: 'commonjs react',
    },
    resolve: {
      symlinks: true,
    },
  });
  const webpackBundle = fs.readFileSync(
    path.join(webpackOutput, 'bundle.js'),
    'utf8',
  );
  assert(webpackBundle.length > 0);

  console.log('Verified production consumer builds with Vite/Rollup and Webpack.');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
