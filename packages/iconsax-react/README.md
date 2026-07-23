# Iconsax for React

993 icons in six styles, built on a 24px grid. Browse the collection at [iconsax-react.pages.dev](https://iconsax-react.pages.dev/).

Looking for React Native? Use [`iconsax-react-native`](https://www.npmjs.com/package/iconsax-react-native).

## Installation

```bash
yarn add iconsax-react
# or
npm install iconsax-react
```

## Import modes

The existing root import remains supported. It keeps the `variant` prop, including runtime switching and the existing fallback to `Linear` for an unknown variant:

```jsx
import { EmojiHappy } from 'iconsax-react';

<EmojiHappy color="#292d32" size={24} variant="Bulk" />;
```

An individual dynamic import has the same behavior and six variants, while making the one-icon dependency explicit:

```jsx
import EmojiHappy, {
  EmojiHappy as EmojiHappyNamed,
} from 'iconsax-react/icons/EmojiHappy';

<EmojiHappy variant="TwoTone" />;
```

A fixed-variant import is the smallest option because it includes only one SVG variant:

```jsx
import { EmojiHappy } from 'iconsax-react/bulk/EmojiHappy';

<EmojiHappy color="rebeccapurple" />;
```

Fixed paths are available under `linear`, `outline`, `broken`, `bold`, `bulk`, and `twotone`. Each leaf module has named and default exports. Fixed components accept the existing SVG props, refs, defaults, `color`, and `size`; their TypeScript props omit `variant`, and a JavaScript `variant` value is ignored.

Avoid namespace imports in application bundles:

```jsx
import * as Icons from 'iconsax-react';
```

Namespace imports intentionally include the complete collection. This is useful for an icon browser or runtime name lookup, but named or leaf imports are smaller and more deterministic.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `color` | `string` | `currentColor` | Any SVG/CSS color |
| `size` | `number \| string` | `24` | Sets SVG width and height |
| `variant` | `Linear \| Outline \| TwoTone \| Bulk \| Broken \| Bold` | `Linear` | Dynamic components only |

All other SVG attributes are forwarded to the `<svg>` element.

See [MIGRATION.md](./MIGRATION.md) for the additive 0.1.0 import options.

## Contributing

See the repository [contribution guide](../../CONTRIBUTING.md).

## License

[MIT](../../LICENSE)
