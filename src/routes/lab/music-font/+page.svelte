<script lang="ts">
  import bravuraFontUrl from "@vexflow-fonts/bravura/bravura.otf?url";
  import opentype from "opentype.js";
  import { onMount } from "svelte";

  let glyphStatus = $state<"loading" | "ready" | "error">("loading");

  async function GlyphPath(glyphChar: string, fontSize: number = 16): Promise<string> {
    let font = await loadFont(bravuraFontUrl);
    if (!font) return "▤";
    const glyph = font.charToGlyph(glyphChar);
    if (!glyph) return "▤";
    const path = glyph.getPath(0, 0, fontSize);
    const bbox = path.getBoundingBox();
    const width = bbox.x2 - bbox.x1;
    const height = bbox.y2 - bbox.y1;
    let pd = path.toPathData(5);
    // console.log("width: ", width, ", height: ", height, ", path: ", pd);

    if (glyphStatus === "loading") {
      return `<span>…</span>`;
    } else if (glyphStatus === "error") {
      return `<span>${glyphChar}</span>`;
    }
    return (
      "" +
      // - use `fontSize` as the height so the font render spacing is 1em
      // - move path down 1em
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${fontSize}" class="inline-block overflow-visible">
         <g fill="currentColor" class="text-slate-800" transform="translate(0, ${fontSize})">
           <path d="${pd}" />
         </g>
       </svg>`
    );
  }

  async function loadFont(fontUrl: string): Promise<opentype.Font | null> {
    try {
      const response = await fetch(fontUrl);
      const buffer = await response.arrayBuffer();
      let font = opentype.parse(buffer);
      glyphStatus = "ready";
      return font;
    } catch (error) {
      glyphStatus = "error";
    }
    return null;
  }

  //
  // render onto staff
  // staffSpacePx = 20 = 1/4 font units = 250 units
  // stepPx = staffSpacePx / 2 = 10
  // y = topLineY + n * stepPx

  // pixels_per_unit = fontSizePx / unitPerEm
  // glyphHeightPx = glyphUnits * pixels_per_unit
  // Assert(glyphHeightPx == staffSpacePx)
  //
  // 20px = 250 units => 80px = 1000 units
  //
  // Note to Y-coordinate mapping
  const NOTE_MAP = {
    C4: 120,
    D4: 110,
    E4: 100, // bottomStaffLine
    F4: 90,
    G4: 80,
    A4: 70,
    B4: 60,
    C5: 50,
    D5: 40,
    E5: 30,
    F5: 20, // topStaffLine
    G5: 10,
    A5: 0,
  } as const; // Added 'as const' to infer literal types for keys
  type NoteMapKey = keyof typeof NOTE_MAP;

  let svgRef: SVGElement | undefined = $state();
  async function renderNote() {
    let font = await loadFont(bravuraFontUrl);
    if (!font) return null;
    const glyph = font.charToGlyph("\ue0a4");
    if (glyph == undefined) return;

    let path = glyph.getPath(0, 0, 80);
    let pathData = path.toPathData(4);
    // console.log(pathData);

    const currentX = 150; // Center position

    const yPos = NOTE_MAP["A4"] || 70;

    // 2. Draw Notehead
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // use 'g' tag to position the element
    g.setAttribute("transform", `translate(${currentX}, ${yPos})`);

    const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svgPath.setAttribute("d", pathData);
    svgPath.setAttribute("fill", "black");
    svgPath.setAttribute("class", "hover:fill-indigo-500");

    g.appendChild(svgPath);
    svgRef?.appendChild(g);
  }

  onMount(async () => {
    await renderNote();
  });
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

<section class="p-4 mb-6">
  <h2 class="text-xl font-bold leading-tight mb-6">To SVG path</h2>
  <p class="text-base">
    show me the notehead symbol: {@html await GlyphPath("\ue0a4")}. Not have a correct aligement!
  </p>
  <p class="text-base">Show me a quarter note: {@html await GlyphPath("\ue1d5")} . The same here.</p>
  <p>
    Those are too small! Bigger one in 40px: {@html await GlyphPath("\ue1d5", 40)}.
  </p>
  <p>Here's the eighth note: {@html await GlyphPath("\ue1d7", 32)}</p>

  <p>how about this? {@html await GlyphPath("\ue1d7")}. It does work! Hover your mouse on!</p>
  <p>A line of music symbols:</p>
  <p>
    {@html await GlyphPath("\ue050")}
    {@html await GlyphPath("\ue010")}
    {@html await GlyphPath("\ue014")}
    {@html await GlyphPath("\ue0a4")}
    {@html await GlyphPath("\ue1d5")}
    {@html await GlyphPath("\ue1d7")}
  </p>

  <p>A line of larger music symbols:</p>
  <p>
    {@html await GlyphPath("\ue050", 40)}
    {@html await GlyphPath("\ue010", 40)}
    {@html await GlyphPath("\ue014", 40)}
    {@html await GlyphPath("\ue0a4", 40)}
    {@html await GlyphPath("\ue1d5", 40)}
    {@html await GlyphPath("\ue1d7", 40)}
  </p>
</section>

<section class="p-4 mb-6">
  <h2 class="text-xl font-bold leading-tight mb-6">Render onto staff</h2>

  <!-- Rendering Canvas -->
  <div class="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative">
    <!-- Staff Container -->
    <div class="p-8 flex justify-center overflow-x-auto">
      <svg width="300" height="120" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" bind:this={svgRef}>
        <!-- Staff Group -->
        <g id="staff-lines" stroke="black" stroke-width="1" stroke-linecap="round">
          <line x1="20" y1="20" x2="280" y2="20" />
          <line x1="20" y1="40" x2="280" y2="40" />
          <line x1="20" y1="60" x2="280" y2="60" />
          <line x1="20" y1="80" x2="280" y2="80" />
          <line x1="20" y1="100" x2="280" y2="100" />
        </g>
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
</style>
