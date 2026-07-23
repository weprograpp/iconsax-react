# Bundle-size benchmark

`baseline.json` records `iconsax-react@0.0.8` with the locked esbuild fixture. React is external, output is ESM, gzip uses level 9, and Brotli uses Node's default quality. Run:

```bash
yarn workspace iconsax-react test:size
```

The test measures six representative one-icon cases, a root named import, and a six-icon mixed-variant bundle. It blocks changes when:

- a fixed-variant import is more than 60% of its legacy dynamic equivalent;
- an individual dynamic import exceeds its legacy equivalent;
- a root named import is more than 1% above its individual dynamic equivalent or contributes unrelated icon code;
- the fixed multi-icon fixture is more than 60% of the legacy equivalent; or
- the unpacked npm payload grows by more than 10%.

Both compressed and unpacked `npm pack --json` values are reported. The unpacked payload is the install-size gate because thousands of required standalone ESM and CommonJS leaf entry points add tar headers even when their extracted contents are smaller. The 0.1.0 fixture is 15,339,889 unpacked bytes versus 15,431,396 for 0.0.8; its compressed tarball is larger because of that entry count.
