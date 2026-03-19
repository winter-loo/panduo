// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
//
// vexflow-core.ts is the entry point for the vexflow-core.js build target.
// It supports dynamic importing of fonts (woff2 / otf), and does not
// bundle or preload any music or text fonts by default.
// All music/text fonts need to be loaded at runtime during page load.
//
// The webpack config inside Gruntfile.js sets the mode to 'production' to produce a minified build.

import { VexFlow } from './src-my/vexflow';

VexFlow.BUILD.INFO = 'vexflow-core';
export * from './src/index';
export { VexFlow } from './src-my/vexflow';
export { BlockNote } from './src-my/blocknote';
export { Formatter } from './src-my/formatter';
export { Metrics, MetricsDefaults } from './src-my/metrics';
export { ModifierContext } from './src-my/modifiercontext';
export { Note } from './src-my/note';
export { NoteHead } from './src-my/notehead';
export { RenderContext } from './src-my/rendercontext';
export { Renderer } from './src-my/renderer';
export { Stave } from './src-my/stave';
export { StaveNote } from './src-my/stavenote';
export { Stem } from './src-my/stem';
export * from './src-my/config';
export * from './src-my/debuggrid';
export * from './src-my/notespan';
export default VexFlow;
