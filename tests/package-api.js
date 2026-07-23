const assert = require('assert');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const TestRenderer = require('react-test-renderer');

const packageDir = path.resolve(__dirname, '..', 'packages', 'iconsax-react');
const cjsDir = path.join(packageDir, 'dist', 'cjs');
const variantPaths = ['linear', 'outline', 'broken', 'bold', 'bulk', 'twotone'];

const render = (Component, props = {}) =>
  renderToStaticMarkup(React.createElement(Component, props));

const main = () => {
  const root = require(path.join(cjsDir, 'index.js'));
  assert.strictEqual(Object.keys(root).length, 993);
  assert.strictEqual(typeof root.EmojiHappy, 'object');

  const dynamicModule = require(path.join(cjsDir, 'EmojiHappy.js'));
  assert.strictEqual(dynamicModule.default, dynamicModule.EmojiHappy);
  assert.strictEqual(dynamicModule.EmojiHappy.displayName, 'EmojiHappy');

  const linearMarkup = render(dynamicModule.EmojiHappy, { variant: 'Linear' });
  const defaultMarkup = render(dynamicModule.EmojiHappy);
  const fallbackMarkup = render(dynamicModule.EmojiHappy, {
    variant: 'NotARealVariant',
  });
  assert.strictEqual(defaultMarkup, linearMarkup);
  assert.strictEqual(fallbackMarkup, linearMarkup);
  assert.match(defaultMarkup, /width="24"/);
  assert.match(defaultMarkup, /height="24"/);
  assert.match(defaultMarkup, /stroke="currentColor"/);

  const customized = render(dynamicModule.EmojiHappy, {
    className: 'custom-icon',
    color: 'rebeccapurple',
    size: '2em',
    id: 'happy',
    'aria-label': 'Happy',
  });
  assert.match(customized, /class="custom-icon"/);
  assert.match(customized, /stroke="rebeccapurple"/);
  assert.match(customized, /width="2em"/);
  assert.match(customized, /height="2em"/);
  assert.match(customized, /aria-label="Happy"/);

  for (const variantPath of variantPaths) {
    const fixedModule = require(path.join(
      cjsDir,
      variantPath,
      'EmojiHappy.js',
    ));
    assert.strictEqual(fixedModule.default, fixedModule.EmojiHappy);
    const fixedMarkup = render(fixedModule.EmojiHappy, {
      variant: 'Bold',
      color: '#abcdef',
    });
    assert.doesNotMatch(fixedMarkup, /\svariant=/);
  }

  const svgNode = { kind: 'svg-node' };
  const ref = React.createRef();
  const renderer = TestRenderer.create(
    React.createElement(dynamicModule.EmojiHappy, { ref }),
    {
      createNodeMock: (element) => (element.type === 'svg' ? svgNode : null),
    },
  );
  assert.strictEqual(ref.current, svgNode);
  renderer.unmount();
  assert.strictEqual(ref.current, null);

  const fixedRef = React.createRef();
  const fixedRenderer = TestRenderer.create(
    React.createElement(
      require(path.join(cjsDir, 'linear', 'EmojiHappy.js')).EmojiHappy,
      { ref: fixedRef },
    ),
    {
      createNodeMock: (element) => (element.type === 'svg' ? svgNode : null),
    },
  );
  assert.strictEqual(fixedRef.current, svgNode);
  fixedRenderer.unmount();
  assert.strictEqual(fixedRef.current, null);

  console.log('Verified root, dynamic, fixed-variant, props, fallback, and ref APIs.');
};

main();
