import type { Configuration } from 'webpack';
import type { ModuleOptions } from 'webpack';

import { plugins } from './webpack.plugins';

// Create renderer-specific rules without the asset relocator
const rendererRules: Required<ModuleOptions>['rules'] = [
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    },
  },
  {
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
  },
];

export const rendererConfig: Configuration = {
  module: {
    rules: rendererRules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
  target: 'web',
};
