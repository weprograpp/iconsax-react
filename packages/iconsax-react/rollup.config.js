import babel from '@rollup/plugin-babel';
import multiInput from 'rollup-plugin-multi-input';

const removeRedundantReactSideEffectImports = () => ({
  name: 'remove-redundant-react-side-effect-imports',
  renderChunk(code, chunk, { format }) {
    if (
      !chunk.facadeModuleId ||
      /[/\\]runtime[/\\]createIcon\.js$/.test(chunk.facadeModuleId)
    ) {
      return null;
    }

    const declaration =
      format === 'cjs' ? "\nrequire('react');\n" : "\nimport 'react';\n";
    if (!code.includes(declaration)) return null;
    return { code: code.replace(declaration, '\n'), map: null };
  },
});

const input = ['src/**/*.js'];
const output = [
  {
    dir: 'dist/cjs',
    format: 'cjs',
    exports: 'named',
    sourcemap: false,
  },
  {
    dir: 'dist/esm',
    format: 'es',
    exports: 'named',
    sourcemap: false,
  },
];

export default {
  input,
  output,
  external: ['react'],
  treeshake: {
    moduleSideEffects: false,
  },
  plugins: [
    multiInput(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
    removeRedundantReactSideEffectImports(),
  ],
};
