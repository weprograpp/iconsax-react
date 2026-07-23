# Migrating to 0.1.0

Version 0.1.0 is additive. Existing root imports and component behavior do not need to change:

```jsx
import { EmojiHappy } from 'iconsax-react';

<EmojiHappy variant="Bulk" />;
```

For a deterministic one-icon dependency graph while keeping runtime variant switching, use:

```jsx
import EmojiHappy, {
  EmojiHappy as EmojiHappyNamed,
} from 'iconsax-react/icons/EmojiHappy';
```

For the smallest bundle, select the variant in the import path:

```jsx
import { EmojiHappy } from 'iconsax-react/bulk/EmojiHappy';

<EmojiHappy />;
```

Fixed-variant components accept all existing SVG, color, size, and ref props. Their TypeScript type omits `variant`; a JavaScript `variant` prop is ignored and is not forwarded to the SVG.

Namespace imports intentionally retain the complete collection:

```jsx
import * as Icons from 'iconsax-react';
```

Keep namespace imports for icon browsers or runtime name lookup. Prefer a named, individual, or fixed-variant import in application code.

The `iconsax-react-native` package is not part of this migration.
