const assert = require('assert');
const path = require('path');
const fs = require('fs');
const cc = require('camelcase');
const cheerio = require('cheerio');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const fetchIcon = require('../scripts/fetchIcon');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'iconsax-react');
const color = '#123456';
const size = 37;
const variantPaths = {
  Bold: 'bold',
  Broken: 'broken',
  Bulk: 'bulk',
  Linear: 'linear',
  Outline: 'outline',
  TwoTone: 'twotone',
};

const toComponentName = (filename) => {
  const name = cc(filename.replace('.svg', ''), { pascalCase: true });
  return /^\d/.test(name) ? `I${name}` : name;
};

const normalizeAttributes = (attributes, replaceColor = false) =>
  Object.fromEntries(
    Object.entries(attributes || {})
      .map(([name, value]) => [
        name,
        replaceColor && /^(#292D32|#17191C|#000)$/.test(value) ? color : value,
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
  );

const normalizeElement = (element, replaceColor = false) => ({
  name: element.name,
  attributes: normalizeAttributes(element.attribs, replaceColor),
  children: (element.children || [])
    .filter((child) => child.name)
    .map((child) => normalizeElement(child, replaceColor)),
});

const expectedTree = (sourcePath) => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const $ = cheerio.load(source, { xmlMode: true });
  const sourceSvg = $('svg').get(0);
  return {
    name: 'svg',
    attributes: normalizeAttributes({
      'data-fidelity': 'true',
      fill: 'none',
      height: String(size),
      viewBox: '0 0 24 24',
      width: String(size),
      xmlns: 'http://www.w3.org/2000/svg',
    }),
    children: sourceSvg.children
      .filter((child) => child.name)
      .map((child) => normalizeElement(child, true)),
  };
};

const actualTree = (Component, variant) => {
  const markup = renderToStaticMarkup(
    React.createElement(Component, {
      color,
      size,
      variant,
      'data-fidelity': 'true',
    }),
  );
  const $ = cheerio.load(markup, { xmlMode: true });
  return normalizeElement($('svg').get(0));
};

const main = () => {
  const icons = fetchIcon(rootDir);
  const descriptors = icons.categories.flatMap((category) =>
    category.icons.map((filename) => ({
      category: category.name,
      filename,
      componentName: toComponentName(filename),
    })),
  );

  assert.strictEqual(
    descriptors.length,
    993,
    'The public React icon inventory must remain at 993 icons.',
  );

  let comparisons = 0;
  for (const { category, filename, componentName } of descriptors) {
    const dynamicModule = require(path.join(
      packageDir,
      'dist',
      'cjs',
      `${componentName}.js`,
    ));

    for (const variant of icons.variants) {
      const fixedModule = require(path.join(
        packageDir,
        'dist',
        'cjs',
        variantPaths[variant],
        `${componentName}.js`,
      ));
      const expected = expectedTree(
        path.join(rootDir, 'icons', variant, category, filename),
      );

      assert.deepStrictEqual(
        actualTree(fixedModule[componentName], 'Broken'),
        expected,
        `${componentName} fixed ${variant} output changed`,
      );
      assert.deepStrictEqual(
        actualTree(dynamicModule[componentName], variant),
        expected,
        `${componentName} dynamic ${variant} output changed`,
      );
      comparisons += 1;
    }
  }

  console.log(
    `Verified ${comparisons} fixed and ${comparisons} dynamic icon/variant renders.`,
  );
};

main();
