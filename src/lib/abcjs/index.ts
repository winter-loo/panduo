/**!
Copyright (c) 2009-2024 Paul Rosen and Gregory Dyke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

 **This text is from: http://opensource.org/licenses/MIT**
!**/

import version from "./version";
export { default as strTranspose } from "./src/str/output";

export const signature = "abcjs-basic v" + version;

export * from "./src/api/abc_animation";
export * from "./src/api/abc_tunebook";

export { default as renderAbc } from "./src/api/abc_tunebook_svg";
export { default as tuneMetrics } from "./src/api/tune-metrics";
export { default as TimingCallbacks } from "./src/api/abc_timing_callbacks";

export { default as GlyphsModule } from "./src/write/creation/glyphs";

export { default as Editor } from "./src/edit/abc_editor";
export { default as EditArea } from "./src/edit/abc_editarea";

export * as synth from "./src/synth"
