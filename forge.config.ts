import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as path from 'path';
import * as fs from 'fs';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '{**/*.node,**/spawn-helper}',
    },
  },
  rebuildConfig: {},
  hooks: {
    postPackage: async (forgeConfig, options) => {
      console.log('Running postPackage hook to unpack spawn-helper...');
      const { outputPaths, platform } = options;

      for (const outputPath of outputPaths) {
        // Find the .app bundle (macOS) or the executable directory
        let appPath = outputPath;
        if (platform === 'darwin') {
          // outputPath is like out/mason-app-darwin-arm64
          // We need to find the .app bundle inside it
          const files = fs.readdirSync(outputPath);
          const appBundle = files.find(f => f.endsWith('.app'));
          if (appBundle) {
            appPath = path.join(outputPath, appBundle);
          }
        }

        const asarPath = path.join(appPath, 'Contents', 'Resources', 'app.asar');
        const unpackedPath = path.join(appPath, 'Contents', 'Resources', 'app.asar.unpacked');
        const spawnHelperInAsar = '.webpack/build/Release/spawn-helper';
        const spawnHelperDest = path.join(unpackedPath, spawnHelperInAsar);

        console.log(`Looking for ASAR at: ${asarPath}`);

        // Extract spawn-helper from ASAR
        const asar = require('@electron/asar');
        try {
          const spawnHelperBuffer = asar.extractFile(asarPath, spawnHelperInAsar);

          // Create directory and write file
          fs.mkdirSync(path.dirname(spawnHelperDest), { recursive: true });
          fs.writeFileSync(spawnHelperDest, spawnHelperBuffer);
          fs.chmodSync(spawnHelperDest, 0o755);

          console.log(`Successfully unpacked spawn-helper to ${spawnHelperDest}`);
        } catch (error) {
          console.error('Failed to unpack spawn-helper:', error);
          throw error;
        }
      }
    },
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      devServer: {
        port: 5000,
      },
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
              config: {
                module: {
                  rules: [
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
                  ],
                },
                plugins: [],
                resolve: {
                  extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
                },
                target: 'electron-preload',
              },
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      // Must be false so the native spawn-helper can load from app.asar.unpacked
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
