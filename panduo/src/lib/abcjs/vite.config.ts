import { defineConfig, type PluginOption } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

type BuildPreset = {
  entry: string;
  fileName: string;
  bannerType: 'basic' | 'plugin';
  minify: 'esbuild' | false;
  sourcemap: boolean;
  emptyOutDir: boolean;
};

const presets: Record<string, BuildPreset> = {
  basic: {
    entry: path.resolve(__dirname, 'index.js'),
    fileName: 'abcjs-basic.js',
    bannerType: 'basic',
    minify: false,
    sourcemap: true,
    emptyOutDir: true,
  },
  'basic-min': {
    entry: path.resolve(__dirname, 'index.js'),
    fileName: 'abcjs-basic-min.js',
    bannerType: 'basic',
    minify: 'esbuild',
    sourcemap: false,
    emptyOutDir: false,
  },
  plugin: {
    entry: path.resolve(__dirname, 'plugin.js'),
    fileName: 'abcjs-plugin-min.js',
    bannerType: 'plugin',
    minify: 'esbuild',
    sourcemap: false,
    emptyOutDir: false,
  },
};

const bannerFor = (type: 'basic' | 'plugin') =>
  `/*! abcjs_${type} v${pkg.version} Copyright © 2009-2024 Paul Rosen and Gregory Dyke (https://abcjs.net) */\n` +
  `/*! For license information please see abcjs_${type}.LICENSE */`;

export default defineConfig(async ({ mode }) => {
  const analyze = mode === 'analyze';
  const presetKey = analyze ? 'basic-min' : mode;
  const preset = presets[presetKey] ?? presets.basic;

  const plugins: PluginOption[] = [];

  if (analyze) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(
      visualizer({
        filename: 'dist/abcjs-basic-report.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }) as PluginOption,
    );
  }

  return {
    plugins,
    build: {
      lib: {
        entry: preset.entry,
        formats: ['umd'],
        name: 'ABCJS',
        fileName: () => preset.fileName,
      },
      target: 'es2017',
      sourcemap: preset.sourcemap,
      minify: preset.minify,
      emptyOutDir: preset.emptyOutDir,
      outDir: 'dist',
      rollupOptions: {
        output: {
          banner: bannerFor(preset.bannerType),
        },
      },
    },
  };
});
