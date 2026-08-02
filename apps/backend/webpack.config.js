const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('node:path');

module.exports = (config, { options }) => ({
  ...config,
  watch: options.watch,
  output: {
    ...config.output,
    path: join(__dirname, '../../dist/apps/backend'),
  },
  plugins: [
    ...(config.plugins ?? []),
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.build.json',
      optimization: false,
      outputHashing: 'none',
      sourceMap: true,
      typeCheckOptions: { async: false },
    }),
  ],
});
