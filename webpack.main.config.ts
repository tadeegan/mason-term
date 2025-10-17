import { promises as fs } from 'fs';
import type { Compiler, Configuration } from 'webpack';
import path from 'path';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

class EnsureSpawnHelperPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.afterEmit.tapPromise('EnsureSpawnHelperPlugin', async () => {
      const source = path.resolve(__dirname, 'node_modules/node-pty/build/Release/spawn-helper');
      // Copy spawn-helper to where node-pty expects it: ../build/Release/spawn-helper relative to outputPath
      const destination = path.resolve(compiler.outputPath, '../build/Release/spawn-helper');
      console.log(`Copying spawn-helper from ${source} to ${destination}`);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(source, destination);
      await fs.chmod(destination, 0o755);
      console.log(`spawn-helper copied successfully to ${destination}`);
    });
  }
}

const mainPlugins = [
  ...plugins,
  new EnsureSpawnHelperPlugin(),
];

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: mainPlugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  target: 'electron-main',
};
