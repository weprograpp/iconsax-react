/* eslint-disable no-param-reassign */
const path = require('path');
const fs = require('fs').promises;
const { readFileSync } = require('fs');
const cheerio = require('cheerio');
const prettier = require('prettier-eslint');
const cc = require('camelcase');

const rootDir = path.resolve(__dirname, '..');
const iconsDir = path.join(rootDir, 'icons');
const packageDir = path.join(rootDir, 'packages');

const VARIANT_PATHS = {
  Bold: 'bold',
  Broken: 'broken',
  Bulk: 'bulk',
  Linear: 'linear',
  Outline: 'outline',
  TwoTone: 'twotone',
};

const format = (text) =>
  prettier({
    text,
    eslintConfig: {
      extends: 'airbnb',
    },
    prettierOptions: {
      bracketSpacing: true,
      singleQuote: true,
      parser: 'flow',
    },
  });

const toComponentName = (filename) => {
  const name = cc(filename.replace('.svg', ''), { pascalCase: true });
  return /^\d/.test(name) ? `I${name}` : name;
};

const convertAttrsToReactAttrs = (attributes) => {
  const converted = Object.keys(attributes).map((key) => {
    const newKey = cc(key);
    let newValue = attributes[key];

    if (/^(#292D32|#17191C|#000)$/.test(newValue)) {
      newValue = '%%{color}%%';
    }
    if (/^(width|height)$/.test(newKey) && newValue === '24') {
      newValue = '%%{size}%%';
    }

    return { [newKey]: newValue };
  });

  return Object.assign({}, ...converted);
};

const reactiveChildren = (children, isNative) => {
  if (!children.length) return children;

  return children.map((child) => {
    if (isNative && child.name) {
      child.name = child.name[0].toUpperCase() + child.name.slice(1);
    }
    if (!child.attribs) return child;
    return { ...child, attribs: convertAttrsToReactAttrs(child.attribs) };
  });
};

const convertElementInsideSvgToReactElement = (svgFile, isNative = false) => {
  const $ = cheerio.load(svgFile);
  const elements = $('svg > *');

  elements.each((_, element) => {
    if (isNative) {
      element.name = element.name[0].toUpperCase() + element.name.slice(1);
    }
    element.attribs = convertAttrsToReactAttrs(element.attribs);
    element.children = reactiveChildren(element.children, isNative);
  });

  return elements.toString().replace(/"?%%"?/g, '');
};

const reactTypeDefinitions = `/// <reference types="react" />
import { FC, SVGAttributes, Ref } from 'react';

export interface IconProps extends SVGAttributes<SVGElement> {
  variant?: 'Linear' | 'Outline' | 'Broken' | 'Bold' | 'Bulk' | 'TwoTone';
  ref?: Ref<SVGSVGElement>;
  color?: string;
  size?: string | number;
}

export type FixedIconProps = Omit<IconProps, 'variant'>;
export type Icon = FC<IconProps>;
export type FixedIcon = FC<FixedIconProps>;
`;

const createIconRuntime = `import { createElement, forwardRef, Fragment } from 'react';

const resolveRenderer = (renderers, variant) => {
  if (typeof renderers === 'function') return renderers;
  return renderers[variant] || renderers.Linear;
};

export const createIcon = (renderers, displayName) => {
  const IconComponent = forwardRef(
    (
      {
        variant = 'Linear',
        color = 'currentColor',
        size = '24',
        ...rest
      },
      ref,
    ) => (
      <svg
        {...rest}
        xmlns="http://www.w3.org/2000/svg"
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        {resolveRenderer(renderers, variant)(createElement, Fragment, color)}
      </svg>
    ),
  );

  IconComponent.displayName = displayName;
  return IconComponent;
};
`;

const dynamicTypeDefinition = (componentName) => `import { Icon } from 'iconsax-react';

export declare const ${componentName}: Icon;
export default ${componentName};
`;

const fixedTypeDefinition = (componentName) => `import { FixedIcon } from 'iconsax-react';

export declare const ${componentName}: FixedIcon;
export default ${componentName};
`;

const runWithConcurrency = async (items, concurrency, task) => {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await task(items[currentIndex], currentIndex);
      }
    },
  );
  await Promise.all(workers);
};

const react = async (icons) => {
  const sourceDir = path.join(packageDir, 'iconsax-react', 'src');
  const runtimeDir = path.join(sourceDir, 'runtime');
  const dynamicDir = sourceDir;
  const dynamicTypesDir = path.join(sourceDir, 'types', 'icons');
  const fixedTypesDir = path.join(sourceDir, 'types', 'fixed');
  const variantDirs = Object.values(VARIANT_PATHS).map((variantPath) =>
    path.join(sourceDir, variantPath),
  );

  await Promise.all(
    [
      runtimeDir,
      dynamicDir,
      dynamicTypesDir,
      fixedTypesDir,
      ...variantDirs,
    ].map((directory) => fs.mkdir(directory, { recursive: true })),
  );
  await fs.writeFile(
    path.join(runtimeDir, 'createIcon.js'),
    createIconRuntime,
    'utf8',
  );

  const descriptors = icons.categories.flatMap((category) =>
    category.icons.map((filename) => ({
      category: category.name,
      filename,
      componentName: toComponentName(filename),
    })),
  );
  const componentNames = new Set();
  for (const descriptor of descriptors) {
    if (componentNames.has(descriptor.componentName)) {
      throw new Error(`Duplicate component name: ${descriptor.componentName}`);
    }
    componentNames.add(descriptor.componentName);
  }

  await runWithConcurrency(descriptors, 12, async (descriptor) => {
    const { category, filename, componentName } = descriptor;
    const convertedVariants = Object.fromEntries(
      icons.variants.map((variant) => {
        const svgFile = readFileSync(
          path.join(iconsDir, variant, category, filename),
        );
        return [
          variant,
          convertElementInsideSvgToReactElement(svgFile, false),
        ];
      }),
    );

    const writes = icons.variants.map((variant) => {
      const variantPath = VARIANT_PATHS[variant];
      const source = `import { createIcon } from '../runtime/createIcon.js';

export const render = (createElement, Fragment, color) => <>${convertedVariants[variant]}</>;

const ${componentName} = /*#__PURE__*/ createIcon(render, '${componentName}');

export { ${componentName} };
export default ${componentName};
`;
      return fs.writeFile(
        path.join(sourceDir, variantPath, `${componentName}.js`),
        source,
        'utf8',
      );
    });

    const imports = icons.variants
      .map(
        (variant) =>
          `import { render as render${variant} } from './${VARIANT_PATHS[variant]}/${componentName}.js';`,
      )
      .join('\n');
    const variants = icons.variants
      .map((variant) => `  ${variant}: render${variant},`)
      .join('\n');
    const dynamicSource = `import { createIcon } from './runtime/createIcon.js';
${imports}

const renderers = {
${variants}
};

const ${componentName} = /*#__PURE__*/ createIcon(renderers, '${componentName}');

export { ${componentName} };
export default ${componentName};
`;

    writes.push(
      fs.writeFile(
        path.join(dynamicDir, `${componentName}.js`),
        dynamicSource,
        'utf8',
      ),
      fs.writeFile(
        path.join(dynamicTypesDir, `${componentName}.d.ts`),
        dynamicTypeDefinition(componentName),
        'utf8',
      ),
      fs.writeFile(
        path.join(fixedTypesDir, `${componentName}.d.ts`),
        fixedTypeDefinition(componentName),
        'utf8',
      ),
    );

    await Promise.all(writes);
  });

  const rootExports = descriptors
    .map(
      ({ componentName }) =>
        `export { default as ${componentName} } from './${componentName}.js';`,
    )
    .join('\n');
  const rootTypeExports = descriptors
    .map(
      ({ componentName }) =>
        `export declare const ${componentName}: Icon;`,
    )
    .join('\n');

  await Promise.all([
    fs.writeFile(path.join(sourceDir, 'index.js'), `${rootExports}\n`, 'utf8'),
    fs.writeFile(
      path.join(sourceDir, 'index.d.ts'),
      `${reactTypeDefinitions}\n${rootTypeExports}\n`,
      'utf8',
    ),
  ]);
};

const nativeTypeDefinitions = `/// <reference types="react" />
import { FC, Component, Ref } from 'react';
import { SvgProps } from 'react-native-svg';

export interface IconProps extends SvgProps {
  variant?: 'Linear' | 'Outline' | 'Broken' | 'Bold' | 'Bulk' | 'TwoTone';
  ref?: Ref<Component<SvgProps>>;
  color?: string;
  size?: string | number;
}
export type Icon = FC<IconProps>;
`;

const nativeVariantFunctions = (variants) =>
  variants
    .map(
      ({ variant, markup }) =>
        `const ${variant} = ({ color }) => (<>${markup}</>);`,
    )
    .join('\n\n');

const nativeVariantSwitch = (variants) => `const chooseVariant = (variant, color) => {
  switch (variant) {
${variants
  .map(
    ({ variant }) =>
      `    case '${variant}':\n      return <${variant} color={color} />;`,
  )
  .join('\n')}
    default:
      return <Linear color={color} />;
  }
};`;

const reactNative = async (icons) => {
  const sourceDir = path.join(packageDir, 'iconsax-react-native', 'src');
  const descriptors = icons.categories.flatMap((category) =>
    category.icons.map((filename) => ({
      category: category.name,
      filename,
      componentName: toComponentName(filename),
    })),
  );

  await fs.writeFile(
    path.join(sourceDir, 'index.d.ts'),
    format(nativeTypeDefinitions),
    'utf8',
  );

  const exports = [];
  const typeExports = [];
  await runWithConcurrency(descriptors, 12, async (descriptor, index) => {
    const { category, filename, componentName } = descriptor;
    const variants = icons.variants.map((variant) => ({
      variant,
      markup: convertElementInsideSvgToReactElement(
        readFileSync(path.join(iconsDir, variant, category, filename)),
        true,
      ),
    }));
    const source = `
      import React, {forwardRef} from 'react';
      import Svg, { Path, G } from 'react-native-svg';

      ${nativeVariantFunctions(variants)}

      ${nativeVariantSwitch(variants)}

      const ${componentName} =
      forwardRef(({ variant = 'Linear', color = 'currentColor', size = '24', ...rest }, ref) => {
        return (
          <Svg {...rest} xmlns="http://www.w3.org/2000/svg" ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none">
            {chooseVariant(variant, color)}
          </Svg>)
      });

      ${componentName}.displayName = '${componentName}'
      export default ${componentName}
    `;

    await fs.writeFile(
      path.join(sourceDir, `${componentName}.js`),
      format(source),
      'utf8',
    );
    exports[index] =
      `export { default as ${componentName} } from './${componentName}.js';\r`;
    typeExports[index] = `export const ${componentName}: Icon;`;
  });

  await Promise.all([
    fs.writeFile(path.join(sourceDir, 'index.js'), `${exports.join('\n')}\n`),
    fs.appendFile(
      path.join(sourceDir, 'index.d.ts'),
      `${typeExports.join('\n')}\n`,
    ),
  ]);
};

module.exports = {
  react,
  'react-native': reactNative,
};
