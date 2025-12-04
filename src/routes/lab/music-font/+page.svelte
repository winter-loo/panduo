<script lang="ts">
  import { onMount } from "svelte";
  import bravuraFontUrl from "@vexflow-fonts/bravura/bravura.otf?url";
  // woff2 need be decompressed first, https://github.com/opentypejs/opentype.js/issues/183#issuecomment-1147228025
  import opentype from "opentype.js";
  import { SvelteMap } from "svelte/reactivity";

  let bravuraFont: opentype.Font | null = null;
  let glyphPath = $state("");
  let glyphStatus = $state<"loading" | "ready" | "error">("loading");

  let glyphs = new SvelteMap<string, Map<number, { width: number; height: number; path: string }> | null>();

  type ArcCommand = ["A" | "a", [number, number, number, 0 | 1, 0 | 1, number, number]];
  type CubicCurveCommand = ["C" | "c", [number, number, number, number, number, number]];
  type HLineCommand = ["H" | "h", [number]];
  type LineCommand = ["L" | "l", [number, number]];
  type MoveCommand = ["M" | "m", [number, number]];
  type QuadraticCurveCommand = ["Q" | "q", [number, number, number, number]];
  type VLineCommand = ["V" | "v", [number]];
  type ZCommand = ["Z" | "z", []];
  type PathCommand =
    | ArcCommand
    | CubicCurveCommand
    | HLineCommand
    | LineCommand
    | MoveCommand
    | QuadraticCurveCommand
    | VLineCommand
    | ZCommand;
  let abcjsGlyphs: { [index: string]: { d: PathCommand[]; w: number; h: number } } = {
    "noteheads.quarter": {
      d: [
        ["M", [6.09, -4.05]],
        ["c", [0.36, -0.03, 1.2, 0.0, 1.53, 0.06]],
        ["c", [1.17, 0.24, 1.89, 0.84, 2.16, 1.83]],
        ["c", [0.06, 0.18, 0.06, 0.3, 0.06, 0.66]],
        ["c", [0.0, 0.45, 0.0, 0.63, -0.15, 1.08]],
        ["c", [-0.66, 2.04, -3.06, 3.93, -5.52, 4.38]],
        ["c", [-0.54, 0.09, -1.44, 0.09, -1.83, 0.03]],
        ["c", [-1.23, -0.27, -1.98, -0.87, -2.25, -1.86]],
        ["c", [-0.06, -0.18, -0.06, -0.3, -0.06, -0.66]],
        ["c", [0.0, -0.45, 0.0, -0.63, 0.15, -1.08]],
        ["c", [0.24, -0.78, 0.75, -1.53, 1.44, -2.22]],
        ["c", [1.2, -1.2, 2.85, -2.01, 4.47, -2.22]],
        ["z", []],
      ],
      w: 9.81,
      h: 8.094,
    },
    "noteheads.whole": {
      d: [
        ["M", [6.51, -4.05]],
        ["c", [0.51, -0.03, 2.01, 0.0, 2.52, 0.03]],
        ["c", [1.41, 0.18, 2.64, 0.51, 3.72, 1.08]],
        ["c", [1.2, 0.63, 1.95, 1.41, 2.19, 2.31]],
        ["c", [0.09, 0.33, 0.09, 0.9, 0.0, 1.23]],
        ["c", [-0.24, 0.9, -0.99, 1.68, -2.19, 2.31]],
        ["c", [-1.08, 0.57, -2.28, 0.9, -3.75, 1.08]],
        ["c", [-0.66, 0.06, -2.31, 0.06, -2.97, 0.0]],
        ["c", [-1.47, -0.18, -2.67, -0.51, -3.75, -1.08]],
        ["c", [-1.2, -0.63, -1.95, -1.41, -2.19, -2.31]],
        ["c", [-0.09, -0.33, -0.09, -0.9, 0.0, -1.23]],
        ["c", [0.24, -0.9, 0.99, -1.68, 2.19, -2.31]],
        ["c", [1.2, -0.63, 2.61, -0.99, 4.23, -1.11]],
        ["z", []],
        ["m", [0.57, 0.66]],
        ["c", [-0.87, -0.15, -1.53, 0.0, -2.04, 0.51]],
        ["c", [-0.15, 0.15, -0.24, 0.27, -0.33, 0.48]],
        ["c", [-0.24, 0.51, -0.36, 1.08, -0.33, 1.77]],
        ["c", [0.03, 0.69, 0.18, 1.26, 0.42, 1.77]],
        ["c", [0.6, 1.17, 1.74, 1.98, 3.18, 2.22]],
        ["c", [1.11, 0.21, 1.95, -0.15, 2.34, -0.99]],
        ["c", [0.24, -0.51, 0.36, -1.08, 0.33, -1.8]],
        ["c", [-0.06, -1.11, -0.45, -2.04, -1.17, -2.76]],
        ["c", [-0.63, -0.63, -1.47, -1.05, -2.4, -1.2]],
        ["z", []],
      ],
      w: 14.985,
      h: 8.097,
    },
    "noteheads.half": {
      d: [
        ["M", [7.44, -4.05]],
        ["c", [0.06, -0.03, 0.27, -0.03, 0.48, -0.03]],
        ["c", [1.05, 0.0, 1.71, 0.24, 2.1, 0.81]],
        ["c", [0.42, 0.6, 0.45, 1.35, 0.18, 2.4]],
        ["c", [-0.42, 1.59, -1.14, 2.73, -2.16, 3.39]],
        ["c", [-1.41, 0.93, -3.18, 1.44, -5.4, 1.53]],
        ["c", [-1.17, 0.03, -1.89, -0.21, -2.28, -0.81]],
        ["c", [-0.42, -0.6, -0.45, -1.35, -0.18, -2.4]],
        ["c", [0.42, -1.59, 1.14, -2.73, 2.16, -3.39]],
        ["c", [0.63, -0.42, 1.23, -0.72, 1.98, -0.96]],
        ["c", [0.9, -0.3, 1.65, -0.42, 3.12, -0.54]],
        ["z", []],
        ["m", [1.29, 0.87]],
        ["c", [-0.27, -0.09, -0.63, -0.12, -0.9, -0.03]],
        ["c", [-0.72, 0.24, -1.53, 0.69, -3.27, 1.8]],
        ["c", [-2.34, 1.5, -3.3, 2.25, -3.57, 2.79]],
        ["c", [-0.36, 0.72, -0.06, 1.5, 0.66, 1.77]],
        ["c", [0.24, 0.12, 0.69, 0.09, 0.99, 0.0]],
        ["c", [0.84, -0.3, 1.92, -0.93, 4.14, -2.37]],
        ["c", [1.62, -1.08, 2.37, -1.71, 2.61, -2.19]],
        ["c", [0.36, -0.72, 0.06, -1.5, -0.66, -1.77]],
        ["z", []],
      ],
      w: 10.37,
      h: 8.132,
    },
  };

  const pathScale = (pathArray: PathCommand[], kx: number, ky: number) => {
    for (let i = 0; i < pathArray.length; i++) {
      let p = pathArray[i];
      for (let j = 0; j < p[1].length; j++) {
        p[1][j] *= j % 2 ? kx : ky;
      }
    }
  };

  const pathClone = (path: PathCommand[]): PathCommand[] => {
    return path.map((p) => [p[0], [...p[1]]] as PathCommand);
  };

  const toSvgPath = (path: PathCommand[]): string => {
    return path.reduce((r, p) => r + p[0] + p[1].join(","), "");
  };

  const GlyphPathForSymbol = (
    symb: string,
    x: number = 0,
    y: number = 0,
    scalex: number = 1,
    scaley: number = 1,
  ): { width: number; height: number; path: string } | null => {
    let g = abcjsGlyphs[symb];
    if (!g) return null;
    let pc = pathClone(g.d);
    if (scalex !== 1 || scaley !== 1) pathScale(pc, scalex, scaley);
    let move = pc[0] as MoveCommand;
    move[1][0] += x;
    move[1][1] += y;
    return { width: g.w, height: g.h, path: toSvgPath(pc) };
  };

  function addGlyph(glyphChar: string) {
    glyphs.set(glyphChar, null);
  }

  function updateGlyphs() {
    for (const [glyphChar, glyphProp] of glyphs) {
      if (glyphProp == null) {
        glyphs.set(glyphChar, GlyphPath(glyphChar));
      }
    }
  }

  type FontSizeScale = 16 | 20 | 32 | 40 | 56 | 72; // in pixel
  const FontSizeScales = [16, 20, 32, 40, 56, 72];
  function GlyphPath(glyphChar: string) {
    if (!bravuraFont) return null;
    const glyph = bravuraFont.charToGlyph(glyphChar);
    if (!glyph) return null;
    const glyphProps = new Map<number, { width: number; height: number; path: string }>();
    for (let i = 0; i < FontSizeScales.length; i++) {
      let fs = FontSizeScales[i];
      const path = glyph.getPath(0, 0, fs);
      const bbox = path.getBoundingBox();
      const width = bbox.x2 - bbox.x1;
      const height = bbox.y2 - bbox.y1;
      glyphPath = path.toPathData(5);
      glyphProps.set(fs, { width, height, path: glyphPath });
    }
    return glyphProps;
  }

  onMount(() => {
    addGlyph("\ue050");
    addGlyph("\ue0a4");
    addGlyph("\ue1d5");
    addGlyph("\ue1d7");
    addGlyph("\ue010");
    addGlyph("\ue014");

    (async () => {
      try {
        const response = await fetch(bravuraFontUrl);
        const buffer = await response.arrayBuffer();
        bravuraFont = opentype.parse(buffer);
        glyphStatus = "ready";
        updateGlyphs();
        renderNotes(["A4"]);
      } catch (error) {
        glyphStatus = "error";
      }
    })();
  });

  //
  // render onto staff
  //
  // Note to Y-coordinate mapping
  const NOTE_MAP = {
    C4: 180,
    D4: 170,
    E4: 160,
    F4: 150,
    G4: 140,
    A4: 130,
    B4: 120,
    C5: 110,
    D5: 100,
    E5: 90,
    F5: 80,
    G5: 70,
    A5: 60,
    B5: 50,
  } as const; // Added 'as const' to infer literal types for keys
  type NoteMapKey = keyof typeof NOTE_MAP;

  let notesLayerRef: SVGGElement | undefined = $state();
  function renderNotes(noteArray: NoteMapKey[]) {
    if (notesLayerRef) notesLayerRef.innerHTML = "";
    const glyph = bravuraFont?.charToGlyph("\ue0a4");
    if (glyph) {
      let pathData = glyph.path.toPathData(5);

      const currentX = 150; // Center position

      noteArray.forEach((notePitch, _index) => {
        const yPos = NOTE_MAP[notePitch] || 120;

        // 2. Draw Notehead
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        // Scale is positive (0.08, 0.08) to ensure the standard tilt direction (bottom-left to top-right: /)
        g.setAttribute("transform", `translate(${currentX}, ${yPos}) scale(0.08, 0.08)`);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData); // Use the global path data
        path.setAttribute("fill", "var(--note-color)");
        path.classList.add("note-animate");
        path.style.opacity = "0"; // Ensure opacity starts at 0 for animation

        g.appendChild(path);
        notesLayerRef?.appendChild(g);
      });
    }
  }
</script>

<h1 class="text-2xl font-bold leading-tight mb-6">Music Font Lab</h1>

<section class="p-4">
  <h2 class="text-xl font-bold leading-tight mb-6">Bravura Font</h2>

  <div class="text-base tracking-wide">
    <p>Let's begin a line without music symbols</p>
    <p>use your mouse to select text to see line height</p>
    <hr class="my-4" />
    <p>
      show me the notehead symbol: <span>&#xe0a4;</span>. Oh! I forget set the `font-family` to `Bravura`. Ok! A normal
      line height
    </p>
    <p>
      show me the notehead symbol: <span class="font-[Bravura]">&#xe0a4;</span>. Hmm! Line height is a little bit
      larger! The actual height of this notehead symbol is 64px!
    </p>
    <p>Show me a quarter note: <span class="font-[Bravura]">&#xe1d5;</span> . The same here.</p>
    <p>
      Those are too small! Bigger one in 40px: <span class="font-[Bravura] text-[40px]">&#xe1d5;</span>. The same size
      but in a different unit(30pt):<span class="font-[Bravura] text-[30pt]">&#xe1d5;</span>. This time, the height of
      this notehead symbol is about 160px! Huge!
    </p>
    <p>Here's the eighth note: <span class="font-[Bravura]">&#xe1d7;</span></p>

    <p>how about this? <span class="music">&#xe1d7;</span>. It does not work! Hover your mouse on!</p>
    <p>a line of music font symbols:</p>
    <p class="font-[Bravura]">&#xe050; &#xe010; &#xe014; &#xe0a4; &#xe1d5; &#xe1d7;</p>
    <p>larger(40px):</p>
    <p class="font-[Bravura] text-[40px]">&#xe050; &#xe010; &#xe014; &#xe0a4; &#xe1d5; &#xe1d7;</p>
  </div>
</section>

{#snippet noteGlyph(glyphChar: string, fontSize: FontSizeScale = 16)}
  {@const glyph = glyphs.get(glyphChar)}

  {#if glyphStatus === "loading"}
    <span>…</span>
  {:else if glyphStatus === "error"}
    <span>?</span>
  {:else if glyph == undefined}
    <span>?</span>
  {:else}
    {@const g = glyph.get(fontSize)}
    <svg xmlns="http://www.w3.org/2000/svg" width="{g?.width}px" height="1em" class="inline-block overflow-visible">
      <g fill="currentColor" class="text-slate-800">
        <path d={g?.path} />
      </g>
    </svg>
  {/if}
{/snippet}

{#snippet abcjsNoteGlyph(glyphName: string, _fontSize: FontSizeScale = 16)}
  {@const glyph = GlyphPathForSymbol(glyphName)}

  {#if glyphStatus === "loading"}
    <span>…</span>
  {:else if glyphStatus === "error"}
    <span>?</span>
  {:else if glyph == undefined}
    <span>?</span>
  {:else}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="{glyph?.width}px"
      height="{glyph?.height}px"
      class="inline-block overflow-visible"
    >
      <g fill="currentColor" class="text-slate-800">
        <path d={glyph?.path} />
      </g>
    </svg>
  {/if}
{/snippet}

<section class="p-4">
  <h2 class="text-xl font-bold leading-tight mb-6">To SVG path</h2>
  <p class="text-base">
    show me the notehead symbol: {@render noteGlyph("\ue0a4")}. Not have a correct aligement!
  </p>
  <p class="text-base">Show me a quarter note: {@render noteGlyph("\ue1d5")} . The same here.</p>
  <p>
    Those are too small! Bigger one in 40px: {@render noteGlyph("\ue1d5", 40)}.
  </p>
  <p>Here's the eighth note: {@render noteGlyph("\ue1d7", 32)}</p>

  <p>how about this? {@render noteGlyph("\ue1d7")}. It does not work! Hover your mouse on!</p>
  <p>A line of music symbols:</p>
  <p class="text-bottom">
    {@render noteGlyph("\ue050")}
    {@render noteGlyph("\ue010")}
    {@render noteGlyph("\ue014")}
    {@render noteGlyph("\ue0a4")}
    {@render noteGlyph("\ue1d5")}
    {@render noteGlyph("\ue1d7")}
  </p>
</section>

<section class="p-4">
  <h2 class="text-xl font-bold leading-tight mb-6">To SVG path</h2>
  <p>
    show me the notehead symbol: {@render abcjsNoteGlyph("noteheads.whole")}. Not have a correct aligement!
  </p>
  <p>Show me a quarter note: {@render abcjsNoteGlyph("noteheads.quarter")} . The same here.</p>
  <p>
    Those are too small! Bigger one in 40px: {@render abcjsNoteGlyph("noteheads.quarter", 40)}.
  </p>
  <p>Here's the eighth note: {@render abcjsNoteGlyph("noteheads.half", 32)}</p>

  <p>how about this? {@render abcjsNoteGlyph("noteheads.half")}. It does not work! Hover your mouse on!</p>
</section>

<section>
  <!-- Rendering Canvas -->
  <div class="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative">
    <!-- Staff Container -->
    <div class="p-8 flex justify-center overflow-x-auto">
      <svg id="musicSvg" width="300" height="250" viewBox="0 0 300 250" xmlns="http://www.w3.org/2000/svg">
        <!-- Staff Group -->
        <g id="staff-lines" stroke="var(--staff-line-color)" stroke-width="2" stroke-linecap="round">
          <line x1="20" y1="80" x2="280" y2="80" />
          <line x1="20" y1="100" x2="280" y2="100" />
          <line x1="20" y1="120" x2="280" y2="120" />
          <line x1="20" y1="140" x2="280" y2="140" />
          <line x1="20" y1="160" x2="280" y2="160" />
        </g>

        <!-- Notes Container -->
        <g id="notes-layer" bind:this={notesLayerRef}></g>
      </svg>
    </div>
  </div>
</section>

<style>
  .music {
    font-family: "Bravura";
    display: inline-block;
    line-height: 1.625;
  }

  .music:hover {
    cursor: pointer;
  }
  :root {
    --staff-line-color: #9ca3af; /* Gray-400 */
    --note-color: #1f2937; /* Gray-800 */
  }

  .note-animate {
    transform-box: fill-box;
    transform-origin: center;
    animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    opacity: 0;
  }

  @keyframes popIn {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
