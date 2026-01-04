/**
 * Babel Configuration for Jest
 * Required to transform ESM modules (like uuid) to CommonJS
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
};
