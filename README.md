<h1 align="center">iconsax for React and React Native</h1>

<p align="center">
  993 icons in 6 different styles, total 5,958 icons |
Perfectly balance | 
24px grid-based
<p>

<p align="center">
  <a href="https://iconsax-react.pages.dev/"><strong>Browse icons at site</strong></a>
</p>
<br>
<br>

> ©️ iconsax [github](https://github.com/lusaxweb/iconsax) and
> [official website](https://iconsax.io/) (other format and platform available)

## Installation

### React

```bash
yarn add iconsax-react
# or
npm i iconsax-react
```

### React Native

```bash
yarn add iconsax-react-native react-native-svg
# or
npm i iconsax-react-native react-native-svg
```

## Usage

```jsx
import React from 'react';
//import icon. for React Native import from 'iconsax-react-native'
import { EmojiHappy } from 'iconsax-react';

const Example = () => {
  // then use it as a normal React Component
  return <EmojiHappy />;
};
```

You can configure Icons with inline props:

```jsx
<EmojiHappy color="#eee" variant="Bulk" size={54} />
```

React applications can also use individual dynamic imports or fixed-variant imports:

```jsx
// Keeps the runtime variant prop and includes all six SVG variants.
import { EmojiHappy } from 'iconsax-react/icons/EmojiHappy';

// Smallest bundle: includes only the Bulk SVG variant.
import { EmojiHappy as BulkEmojiHappy } from 'iconsax-react/bulk/EmojiHappy';
```

Fixed paths are available under `linear`, `outline`, `broken`, `bold`, `bulk`, and `twotone`. Root and individual dynamic imports preserve the existing props, refs, defaults, and invalid-variant fallback.

`import * as Icons from 'iconsax-react'` intentionally includes the complete collection. Use it for runtime icon lookup; prefer named or individual imports in application bundles.

These optimized subpaths apply only to `iconsax-react` in 0.1.0. React Native remains unchanged.

## Props

| Prop      | Type                                                | Default        | Note                   |
| --------- | --------------------------------------------------- | -------------- | ---------------------- |
| `color`   | `string`                                            | `currentColor` | css color              |
| `size`    | `number` `string`                                   | 24px           | size={24} or size="24" |
| `variant` | `Linear` `Outline` `TwoTone` `Bulk` `Broken` `Bold` | `Linear`       | icons styles           |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

[MIT](./LICENSE)
