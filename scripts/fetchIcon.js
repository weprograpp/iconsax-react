const path = require('path');
const fs = require('fs');

const SOURCE_VARIANTS = ['Bold', 'Broken', 'Bulk', 'Linear', 'Outline', 'TwoTone'];

const byName = (left, right) => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const fetchIcon = (rootDir = path.resolve(__dirname, '..')) => {
  const iconsDir = path.join(rootDir, 'icons');
  const canonicalVariantDir = path.join(iconsDir, 'Linear');
  const categories = fs
    .readdirSync(canonicalVariantDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(byName)
    .map((categoryName) => {
      const icons = fs
        .readdirSync(path.join(canonicalVariantDir, categoryName), {
          withFileTypes: true,
        })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
        .map((entry) => entry.name)
        .sort(byName);

      for (const icon of icons) {
        for (const variant of SOURCE_VARIANTS) {
          const sourcePath = path.join(iconsDir, variant, categoryName, icon);
          if (!fs.existsSync(sourcePath)) {
            throw new Error(
              `Missing ${variant} source for ${categoryName}/${icon}: ${sourcePath}`,
            );
          }
        }
      }

      return { name: categoryName, icons };
    });

  return { variants: SOURCE_VARIANTS, categories };
};

fetchIcon.SOURCE_VARIANTS = SOURCE_VARIANTS;

module.exports = fetchIcon;
