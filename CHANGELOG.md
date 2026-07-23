# Changelog

## 0.1.0

- Added per-icon imports such as `iconsax-react/icons/EmojiHappy`.
- Added fixed-variant imports under `linear`, `outline`, `broken`, `bold`, `bulk`, and `twotone`.
- Split SVG variants into independent, side-effect-free modules backed by a shared icon factory.
- Added ESM, CommonJS, modern conditional types, and `typesVersions` package mappings.
- Preserved the root named-export API, all 993 public icons, all six variants, props, refs, defaults, invalid-variant fallback, and legacy `dist/*` paths.
- Removed the unused `prop-types` dependency and obsolete build plugins.
- Added deterministic generation, exhaustive SVG-fidelity checks, consumer-build tests, package validation, and bundle-size budgets.

React Native output is unchanged in this release.
