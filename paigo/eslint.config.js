import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        performance: 'readonly',
        ResizeObserver: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLSpanElement: 'readonly',
        SVGElement: 'readonly',
        SVGSVGElement: 'readonly',
        SVGGElement: 'readonly',
        SVGPathElement: 'readonly',
        SVGRectElement: 'readonly',
        SVGTextElement: 'readonly',
        Element: 'readonly',
        EventTarget: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        CanvasLineCap: 'readonly',
        CanvasGradient: 'readonly',
        CanvasPattern: 'readonly',
        CanvasState: 'readonly',
        CanvasTransform: 'readonly',
        CanvasCompositing: 'readonly',
        CanvasImageSmoothing: 'readonly',
        CanvasFillStrokeStyles: 'readonly',
        CanvasShadowStyles: 'readonly',
        CanvasFilters: 'readonly',
        CanvasRect: 'readonly',
        CanvasDrawPath: 'readonly',
        CanvasText: 'readonly',
        CanvasDrawImage: 'readonly',
        CanvasImageData: 'readonly',
        CanvasPathDrawingStyles: 'readonly',
        CanvasTextDrawingStyles: 'readonly',
        CanvasPath: 'readonly',
        DOMMatrix: 'readonly',
        DOMHighResTimeStamp: 'readonly',
        TextMetrics: 'readonly',
        FontFace: 'readonly',
        OffscreenCanvas: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        structuredClone: 'readonly',
        self: 'readonly',
        global: 'readonly',
        // Node.js globals
        __dirname: 'readonly',
        __filename: 'readonly',
        // Custom globals
        __VF_VERSION__: 'readonly',
        __VF_GIT_COMMIT_ID__: 'readonly',
        __VF_BUILD_DATE__: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'off', // Too many false positives in VexFlow library
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unreachable': 'warn',
      'no-undef': 'error',
      'no-unused-vars': 'off', // Too many false positives in VexFlow library
    },
  },
  {
    files: ['src/routes/**/*.{js,ts,svelte}', 'src/lib/**/*.{js,ts}', '!src/lib/vexflow/**'],
    rules: {
      // Enable stricter rules for our own code (not VexFlow library)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        // Browser globals for Svelte files
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        performance: 'readonly',
        ResizeObserver: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLSpanElement: 'readonly',
        SVGElement: 'readonly',
        SVGSVGElement: 'readonly',
        SVGGElement: 'readonly',
        Element: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
      },
    },
    plugins: {
      svelte,
      '@typescript-eslint': ts,
    },
    rules: {
      ...svelte.configs.recommended.rules,
      'svelte/no-unused-svelte-ignore': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  prettier,
  {
    ignores: [
      'build/',
      '.svelte-kit/',
      'dist/',
      'node_modules/',
      '*.config.js',
      '*.config.*.ts',
      'src/lib/vexflow/**',
    ],
  },
];
