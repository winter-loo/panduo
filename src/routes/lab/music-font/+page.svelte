<script lang="ts">
  import { onMount } from "svelte";
  import bravuraFontUrl from "@vexflow-fonts/bravura/bravura.otf?url";
  import opentype from "opentype.js";
  import { SvelteMap } from "svelte/reactivity";

  let fontSize = 40;
  let bravuraFont: opentype.Font | null = null;
  let glyphPath = $state("");
  let glyphStatus = $state<"loading" | "ready" | "error">("loading");
  let glyphError = $state("");

  let glyphs = new SvelteMap<string, { width: number; height: number; path: string } | null>();

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

  function GlyphPath(glyphChar: string) {
    if (!bravuraFont) return null;
    const glyph = bravuraFont.charToGlyph(glyphChar);
    if (!glyph) return null;
    const path = glyph.getPath(0, 0, fontSize);
    const bbox = path.getBoundingBox();
    const width = bbox.x2 - bbox.x1;
    const height = bbox.y2 - bbox.y1;
    glyphPath = path.toPathData(5);
    return { width, height, path: glyphPath };
  }

  onMount(() => {
    addGlyph("\ue0a4");
    addGlyph("\ue1d5");
    addGlyph("\ue1d7");

    (async () => {
      try {
        const response = await fetch(bravuraFontUrl);
        const buffer = await response.arrayBuffer();
        bravuraFont = opentype.parse(buffer);
        glyphStatus = "ready";
        updateGlyphs();
      } catch (error) {
        glyphStatus = "error";
        glyphError = error instanceof Error ? error.message : String(error);
      }
    })();
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
  </div>
</section>

{#snippet noteGlyph(glyphChar: string)}
  {@const glyph = glyphs.get(glyphChar)}

  {#if glyphStatus === "loading"}
    <span>…</span>
  {:else if glyphStatus === "error"}
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
  <p>
    show me the notehead symbol: {@render noteGlyph("\ue0a4")}. Not have a correct aligement!
  </p>
  <p>Show me a quarter note: {@render noteGlyph("\ue1d5")} . The same here.</p>
  <p>
    Those are too small! Bigger one in 40px: <span class="font-[Bravura] text-[40px]">&#xe1d5;</span>. The same size but
    in a different unit(30pt):<span class="font-[Bravura] text-[30pt]">&#xe1d5;</span>. This time, the height of this
    notehead symbol is about 160px! Huge!
  </p>
  <p>Here's the eighth note: <span class="font-[Bravura]">&#xe1d7;</span></p>

  <p>how about this? {@render noteGlyph("\ue1d7")}. It does not work! Hover your mouse on!</p>
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
