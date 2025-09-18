<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { fade } from 'svelte/transition';
  import { NoteDuration, notu } from '$lib/notu';
  import { duration } from 'happy-dom/lib/PropertySymbol.js';

  let showDonut = $state(false);

  function toggleInnerFromEl(donut: HTMLElement, borderWidth: number) {
    const inner = donut.querySelector<HTMLElement>('.inner');
    if (!inner) return;

    // Width toggle (existing behaviour)
    const initialW = Number(inner.dataset.initialWidth || borderWidth * 4 * 2);
    const currentW = parseFloat(inner.style.width || '');
    const isWZero = !isNaN(currentW) ? currentW <= borderWidth * 4 * 2 : false;
    inner.style.width = isWZero ? `${initialW}px` : `${borderWidth * 4 * 2}px`;
  }

  function onDonutClick(e: MouseEvent, borderWidth: number) {
    const donut = e.currentTarget as HTMLElement | null;
    if (donut) toggleInnerFromEl(donut, borderWidth);
  }

  function onDonutKeydown(e: KeyboardEvent, borderWidth: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const donut = e.currentTarget as HTMLElement | null;
      if (donut) toggleInnerFromEl(donut, borderWidth);
    }
  }

  const DURATION_MAP: Record<number, number> = {
    1: 4000,
    2: 2000,
    4: 1000,
    8: 500,
    16: 250,
    32: 125
  };

  function noteWidth(duration: NoteDuration, wholeWidth: number): number {
    return (duration.multiplier * wholeWidth) / duration.baseNoteValue;
  }

  function donutInnerWidth(duration: NoteDuration, fullWidth: number, borderWidth: number): number {
    const baseWidth = noteWidth(duration, fullWidth);
    return duration.baseNoteValue === 8 ? borderWidth * 4 * 2 * 2 : baseWidth - borderWidth * 4;
  }
</script>

<!-- <img src="/image0.png" alt="iPhone screenshot" class="w-[5.51in] h-[2.54in]"/> -->
<!-- <img src="/image0.png" alt="iPhone screenshot" class="w-[844px] h-[390px]"/> -->

<Button onclick={() => (showDonut = !showDonut)} class="fixed -mt-16">show donut</Button>

{#snippet donut(duration: NoteDuration, fullWidth: number, borderWidth: number)}
  {#if showDonut}
    <div
      transition:fade
      class="donut relative"
      role="button"
      tabindex="0"
      aria-label="Toggle donut width"
      onkeydown={(e) => onDonutKeydown(e, borderWidth)}
      onclick={(e) => onDonutClick(e, borderWidth)}
      style="--donut-border-width: {borderWidth}px"
    >
      {#if borderWidth == 4}
        <div
          class="inner absolute h-26 bg-cyan-300 rounded-full {duration.baseNoteValue == 8
            ? 'animate-expand-2'
            : 'animate-expand'}"
          style:width="{donutInnerWidth(duration, fullWidth, borderWidth)}px"
          data-initial-width={donutInnerWidth(duration, fullWidth, borderWidth)}
          style:animation-duration="{DURATION_MAP[duration.baseNoteValue]}ms"
          style="--donut-border-width: {borderWidth}px"
        ></div>
      {:else if borderWidth == 9}
        <div
          class="inner absolute h-64 bg-cyan-300 rounded-full {duration.baseNoteValue == 8
            ? 'animate-expand-2'
            : 'animate-expand'}"
          style:width="{donutInnerWidth(duration, fullWidth, borderWidth)}px"
          data-initial-width={donutInnerWidth(duration, fullWidth, borderWidth)}
          style:animation-duration="{DURATION_MAP[duration.baseNoteValue]}ms"
          style="--donut-border-width: {borderWidth}px"
        ></div>
      {/if}
      {#if borderWidth == 4}
        <!-- 32 + 32 + 16 -->
        <div
          class="outeer absolute {duration.baseNoteValue == 8
            ? 'w-80'
            : 'w-full'} h-42 -top-8 -right-8 -bottom-8 -left-8 border-4 rounded-full border-cyan-400"
        ></div>
      {:else if borderWidth == 9}
        <!-- 180 = 72 + 72 + 36 -->
        <div
          class="outeer absolute {duration.baseNoteValue == 8
            ? 'w-180'
            : 'w-full'} h-102 -top-18 -right-18 -bottom-18 -left-18 border-9 rounded-full border-cyan-400"
        ></div>
      {/if}
      {#if borderWidth == 4}
        <div class="dot absolute -top-1 -bottom-1 w-32 h-28 rounded-full bg-cyan-400"></div>
      {:else if borderWidth == 9}
        <div class="dot absolute -top-1 -bottom-1 w-72 h-66 rounded-full bg-cyan-400"></div>
      {/if}
    </div>
  {:else}
    {noteWidth(duration, fullWidth)}
  {/if}
{/snippet}

<section class="mt-20">
  <!-- 112*4*3 -->
  <div class="line relative flex items-center w-1232 h-128 ml-100 border-2 border-dashed">
    <!-- 112*4, includs border width and padding -->
    <!-- the first measure inclues only 3 beats -->
    <div
      class="measure flex-none inline-flex items-center w-336 h-96 pl-4 border-l-4 border-[#d7d7d7]"
    >
      <div class="flex-none w-112 bg-red-400 opacity-0"></div>
      <div class="flex-none w-112 bg-red-400 opacity-0"></div>
      <div class="flex-none w-56 bg-red-400 opacity-0"></div>
      <div class="flex-none w-56 {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-400 opacity-50">
        {@render donut(notu(8), 448, 4)}
      </div>
    </div>
    <div
      class="measure flex-none inline-flex items-center w-448 h-96 pl-4 border-l-4 border-[#d7d7d7]"
    >
      <div
        class="flex-none w-224 {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-400 opacity-50"
      >
        {@render donut(notu(2), 448, 4)}
      </div>
      <div class="flex-none w-224 {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-400 opacity-50">
        {@render donut(notu(2), 448, 4)}
      </div>
    </div>
    <div
      class="measure flex-none inline-flex items-center w-448 h-96 pl-4 border-l-4 border-[#d7d7d7]"
    >
      <div
        class="flex-none w-112 {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-400 opacity-50"
      >
        {@render donut(notu(4), 448, 4)}
      </div>
    </div>
  </div>

  <h3 class="mt-10">metrics</h3>
  <p>
    donut border width: 4px <br />
    barline to the first note: 4px <br />
    barline width: 4px <br />
    whole note width: 448px <br />
  </p>
</section>

<section class="mt-20">
  <!-- 288*3 -->
  <div class="line relative flex items-center w-864 h-128 ml-100 border-2 border-dashed">
    <!-- 112*4, includs border width and padding -->
    <!-- the first measure inclues only 3 beats -->
    <div
      class="measure flex-none inline-flex items-center w-288 h-96 pl-4 border-l-4 border-[#d7d7d7]"
    >
      <div class="flex-none w-72 bg-red-400 opacity-0"></div>
      <div class="flex-none w-72 bg-red-400 opacity-0"></div>
      <div class="flex-none w-72 bg-red-400 opacity-0"></div>
      <div class="flex-none w-36 bg-red-400 opacity-0"></div>
      <div class="flex-none w-36 {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-400 opacity-50">
        <div class="shift-left-a-little -ml-11">
          {@render donut(notu(8), 288, 4)}
        </div>
      </div>
    </div>
    <div
      class="measure flex-none inline-flex items-center w-288 h-96 pl-4 border-l-4 border-[#d7d7d7]"
    >
      <div
        class="flex-none w-144 {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-400 opacity-50"
      >
        {@render donut(notu(2), 288, 4)}
      </div>
      <div class="flex-none w-144 {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-400 opacity-50">
        {@render donut(notu(2), 288, 4)}
      </div>
    </div>
    <div
      class="measure flex-none inline-flex items-center w-288 h-96 pl-4 border-l-4 border-[#d7d7d7]"
    >
      <div
        class="flex-none w-72 {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-400 opacity-50"
      >
        {@render donut(notu(4), 288, 4)}
      </div>
    </div>
  </div>

  <h3 class="mt-10">metrics</h3>
  <p>
    donut border width: 4px <br />
    barline to the first note: 4px <br />
    barline width: 4px <br />
    whole note width: 288px <br />
    <span class="font-bold">margin left 11px for the first 8th note so that there are gaps between donut circle and the bar line</span> <br />
  </p>
</section>

<section class="mt-20">
  <!-- 855 + 148 + 148 -->
  <div class="line relative flex items-center w-1151 h-128 ml-100 border-2 border-dashed">
    <!-- 112*4, includs border width and padding -->
    <!-- the first measure inclues only 3 beats -->
    <div
      class="measure flex-none inline-flex items-center w-148 h-96 pl-7 border-l-9 border-[#d7d7d7]"
    >
      <div class="flex-none w-40 bg-red-400 opacity-0"></div>
      <div class="flex-none w-108 {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-400 opacity-50">
        {@render donut(notu(8), 864, 9)}
      </div>
    </div>
    <div
      class="measure flex-none inline-flex items-center w-864 h-96 pl-7 border-l-9 border-[#d7d7d7]"
    >
      <div
        class="flex-none {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-400 opacity-50"
        style:width="{noteWidth(notu(4), 864)}px"
      >
        {@render donut(notu(4), 864, 9)}
      </div>
      <div
        class="flex-none {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-400 opacity-50"
        style:width="{noteWidth(notu(8), 864)}px"
      >
        {@render donut(notu(8), 864, 9)}
      </div>
      <div
        class="flex-none {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-400 opacity-50"
        style:width="{noteWidth(notu(8), 864)}px"
      >
        {@render donut(notu(8), 864, 9)}
      </div>
      <div
        class="flex-none {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-400 opacity-50"
        style:width="{noteWidth(notu(4), 864)}px"
      >
        {@render donut(notu(4), 864, 9)}
      </div>
      <div
        class="flex-none {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-400 opacity-50"
        style:width="{noteWidth(notu(8), 864)}px"
      >
        {@render donut(notu(8), 864, 9)}
      </div>
      <div
        class="flex-none {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-400 opacity-50"
        style:width="{noteWidth(notu(8), 864)}px"
      >
        {@render donut(notu(8), 864, 9)}
      </div>
    </div>
    <div
      class="measure flex-none inline-flex items-center w-148 h-96 pl-7 border-l-9 border-[#d7d7d7]"
    >
      <div
        class="flex-none {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-400 opacity-50"
        style:width="{noteWidth(notu(8), 864)}px"
      >
        {@render donut(notu(8), 864, 9)}
      </div>
    </div>
  </div>

  <h3 class="mt-10">metrics</h3>
  <p>
    donut border width: 9px <br />
    barline to the first note: 7px <br />
    barline width: 9px <br />
    whole note width: 864px <br />
  </p>
</section>

<style>
  .line {
    --spacing: 1px;
  }
  /* Smooth width transition for the donut's inner bar */
  .donut .inner {
    transition:
      width 1s ease-in-out,
      height 1s ease-in-out;
    overflow: hidden;
    will-change: width, height;
  }
  .donut {
    cursor: pointer;
  }
  .donut:focus-visible {
    outline: 2px solid #22d3ee; /* cyan-400 */
    outline-offset: 2px;
  }
  /* Animate height for the outer containers that change between h-2 and h-20 */
  .anim-height {
    transition: height 150ms ease-in-out;
  }

  /* Local animation equivalent to `animate-[expand_1s]` without Tailwind */
  .animate-expand {
    animation-name: expand;
    animation-timing-function: ease-in-out;
  }

  .animate-expand-2 {
    animation-name: expand-2;
    animation-timing-function: ease-in-out;
  }

  @keyframes expand {
    0% {
      width: 0px;
    }
    100% {
      width: calc(100% - (4 * var(--donut-border-width)));
    }
  }
  @keyframes expand-2 {
    0% {
      width: 0px;
    }
    100% {
      width: calc(16 * var(--donut-border-width));
    }
  }
</style>
