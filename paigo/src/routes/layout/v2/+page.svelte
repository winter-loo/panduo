<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { fade } from 'svelte/transition';

  let showDonut = $state(false);

  function toggleInnerFromEl(donut: HTMLElement) {
    const inner = donut.querySelector<HTMLElement>('.inner');
    if (!inner) return;

    // Width toggle (existing behaviour)
    const initialW = Number(inner.dataset.initialWidth || 22);
    const currentW = parseFloat(inner.style.width || '');
    const isWZero = !isNaN(currentW) ? currentW <= 22 : false;
    inner.style.width = isWZero ? `${initialW}px` : '22px';
  }

  function onDonutClick(e: MouseEvent) {
    const donut = e.currentTarget as HTMLElement | null;
    if (donut) toggleInnerFromEl(donut);
  }

  function onDonutKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const donut = e.currentTarget as HTMLElement | null;
      if (donut) toggleInnerFromEl(donut);
    }
  }

  const WIDTH_CLASS_MAP: Record<string, string> = {
    '1': 'w-432',
    '2': 'w-208',
    '4': 'w-96',
    '8': 'w-40',
  };

  const DURATION_MAP: Record<number, number> = {
    1: 4000,
    2: 2000,
    4: 1000,
    8: 500,
    16: 250,
    32: 125
  };

  function parseWidthClass(width_clsname: string) {
    return width_clsname.substring(width_clsname.indexOf('-') + 1);
  }
</script>

<Button onclick={() => (showDonut = !showDonut)}>show donut</Button>

{#snippet donut(duration: number)}
  {#if showDonut}
    <div
      transition:fade
      class="donut relative"
      role="button"
      tabindex="0"
      aria-label="Toggle donut width"
      onkeydown={onDonutKeydown}
      onclick={onDonutClick}
    >
      <div
        class="inner {WIDTH_CLASS_MAP[duration] ??
          ''} absolute h-20 bg-cyan-300 rounded-full opacity-50 animate-expand"
        data-initial-width={parseWidthClass(WIDTH_CLASS_MAP[duration])}
        style:animation-duration="{DURATION_MAP[duration]}ms"
      ></div>
      <div
        class="outter absolute w-full h-36 -top-8 -right-8 -bottom-8 -left-8 border-4 rounded-full border-cyan-400"
      ></div>
      <div class="dot absolute -top-1 -left-1 w-22 h-22 rounded-full bg-cyan-400"></div>
    </div>
  {:else}
    {parseInt(parseWidthClass(WIDTH_CLASS_MAP[duration])) + 16}
  {/if}
{/snippet}

<div class="line relative flex items-center w-672 h-128">
  <div class="w-56 {showDonut ? 'h-2' : 'h-20'} ml-440 anim-height bg-red-200">
    {@render donut(8)}
  </div>
  <div class="barline absolute left-440 h-100 w-4 bg-[#d7d7d7] opacity-50"></div>
  <div class="w-224 {showDonut ? 'h-2' : 'h-20'} mt-20 anim-height bg-red-200">
    {@render donut(2)}
  </div>
  <div class="w-224 {showDonut ? 'h-2' : 'h-20'} anim-height bg-red-200">
    {@render donut(2)}
  </div>
  <div class="barline absolute left-888 h-100 w-4 bg-[#d7d7d7] opacity-50"></div>
  <div class="w-112 {showDonut ? 'h-2' : 'h-20'} anim-height mb-20 bg-red-200">
    {@render donut(4)}
  </div>
  <!-- 216*3*2-9-7 -->
  <div class="barline absolute left-656 h-100 w-4 bg-[#d7d7d7] opacity-50"></div>
</div>

<h3>metrics</h3>
<p>
  donut border width: 4px <br />
  barline to the first note: 4px <br />
</p>
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

  @keyframes expand {
    0% {
      width: 0px;
    }
    100% {
      width: calc(100% - 16px);
    }
  }
</style>

