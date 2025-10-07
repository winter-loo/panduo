<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { fly, fade } from 'svelte/transition';
  import opentype from 'opentype.js';
  import '@vexflow-fonts/bravura/index.css';
  import bravuraMetadata from '@vexflow-fonts/bravura/metadata.json';
  import bravuraFontUrl from '@vexflow-fonts/bravura/bravura.otf?url';

  const glyphChar = '\ue0a4';
  const glyphName = 'noteheadBlack';
  const glyphCodePoint = 0xe0a4;
  const smuflBox = bravuraMetadata.glyphBBoxes?.[glyphName];
  const smuflWidthSpaces = smuflBox
    ? smuflBox.bBoxNE[0] - smuflBox.bBoxSW[0]
    : null;
  const smuflHeightSpaces = smuflBox
    ? smuflBox.bBoxNE[1] - smuflBox.bBoxSW[1]
    : null;

  let length = $state(50);
  let outputContainer: HTMLElement;
  let fontSize = $state(40);
  let bravuraFont: opentype.Font | null = null;
  let fontReady = $state(false);
  let glyphPath = $state('');
  let glyphViewBox = $state('0 0 120 120');
  let glyphTransform = $state('');
  let glyphBounds = $state<{ width: number; height: number } | null>(null);
  let glyphPadding = $state(12);
  let glyphStatus = $state<'loading' | 'ready' | 'error'>('loading');
  let glyphError = $state('');
  let unitsPerEm = $state<number | null>(null);

  function updateGlyphPath() {
    if (!bravuraFont) return;
    const glyph = bravuraFont.charToGlyph(String.fromCodePoint(glyphCodePoint));
    const path = glyph.getPath(0, 0, fontSize);
    const bbox = path.getBoundingBox();
    const width = bbox.x2 - bbox.x1;
    const height = bbox.y2 - bbox.y1;
    const padding = 4;
    glyphPadding = padding;
    glyphPath = path.toPathData(5);
    glyphTransform = `translate(${padding - bbox.x1}, ${padding - bbox.y1})`;
    glyphViewBox = `0 0 ${width + padding * 2} ${height + padding * 2}`;
    glyphBounds = { width, height };
    glyphStatus = 'ready';
  }

  onMount(() => {
    const svgNS = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '20');
    rect.setAttribute('width', '50');
    rect.setAttribute('height', '50');
    rect.setAttribute('fill', '#aa7777');

    svg.appendChild(rect);
    outputContainer.appendChild(svg);

    (async () => {
      try {
        const response = await fetch(bravuraFontUrl);
        const buffer = await response.arrayBuffer();
        bravuraFont = opentype.parse(buffer);
        unitsPerEm = bravuraFont.unitsPerEm ?? null;
        fontReady = true;
        updateGlyphPath();
      } catch (error) {
        glyphStatus = 'error';
        glyphError = error instanceof Error ? error.message : String(error);
      }
    })();
  });

  $effect(() => {
    if (!fontReady) return;
    fontSize;
    updateGlyphPath();
  });

  let showWhich = $state(3);

  let highlightScale = $state(1);
  const toggleHighlightScale = () => {
    highlightScale = highlightScale === 1 ? 1.4 : 1;
  };
  const highlightTransform = $derived(`scale(${highlightScale})`);
</script>

<main class="flex flex-wrap mt-10 mb-20 ml-5 gap-2">
  <section class="p-10 border-4 border-dashed max-w-3xl space-y-4">
    <h3 class="text-lg font-bold">Music font glyph → SVG path</h3>
    <p class="text-sm text-slate-500">
      This demo fetches the Bravura music font, extracts the black notehead glyph and converts it
      into an SVG <span class="font-mono">&lt;path&gt;</span>. Slide the control to see how glyph metrics
      scale independently of the rendered notehead.
    </p>
    <label class="flex items-center gap-3 text-sm font-medium">
      <span>Font size</span>
      <input type="range" min="10" max="160" step="5" bind:value={fontSize} class="grow" />
      <span class="tabular-nums">{fontSize}px</span>
    </label>

    {#if glyphStatus === 'loading'}
      <p>Loading Bravura glyph…</p>
    {:else if glyphStatus === 'error'}
      <p class="text-red-500">Failed to load glyph: {glyphError}</p>
    {:else}
      <div class="grid gap-6 sm:grid-cols-2">
        <figure class="space-y-2">
          <figcaption class="font-semibold">Text glyph (baseline)</figcaption>
          <svg
            viewBox={glyphViewBox}
            class="w-[200px] h-[200px] border border-dashed border-slate-400 bg-white rounded-md shadow-sm"
          >
            <rect
              x={glyphPadding}
              y={glyphPadding}
              width={glyphBounds ? glyphBounds.width : 0}
              height={glyphBounds ? glyphBounds.height : 0}
              fill="none"
              stroke="#38bdf8"
            />
            <g transform={glyphTransform} class="text-slate-800">
              <text font-family="Bravura" font-size={`${fontSize}px`} x="0" y="0" fill="currentColor">
                {glyphChar}
              </text>
            </g>
          </svg>
        </figure>

        <figure class="space-y-2">
          <figcaption class="font-semibold">Converted SVG path</figcaption>
          <svg
            viewBox={glyphViewBox}
            class="w-[200px] h-[200px] border border-dashed border-slate-400 bg-white rounded-md shadow-sm"
          >
            <rect
              x={glyphPadding}
              y={glyphPadding}
              width={glyphBounds ? glyphBounds.width : 0}
              height={glyphBounds ? glyphBounds.height : 0}
              fill="none"
              stroke="#38bdf8"
            />
            <g transform={glyphTransform} fill="currentColor" class="text-slate-800">
              <path d={glyphPath} />
            </g>
          </svg>
        </figure>
      </div>

      <dl class="grid gap-y-1 text-sm">
        <div class="flex gap-2">
          <dt class="min-w-32 font-semibold">unitsPerEm</dt>
          <dd>{unitsPerEm ?? '—'}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="min-w-32 font-semibold">Path box</dt>
          <dd>
            {#if glyphBounds}
              {glyphBounds.width.toFixed(1)} × {glyphBounds.height.toFixed(1)} px
            {:else}
              —
            {/if}
          </dd>
        </div>
        <div class="flex gap-2">
          <dt class="min-w-32 font-semibold">SMuFL box</dt>
          <dd>
            {#if smuflWidthSpaces !== null && smuflHeightSpaces !== null}
              {smuflWidthSpaces.toFixed(2)} × {smuflHeightSpaces.toFixed(2)} staff spaces
            {:else}
              —
            {/if}
          </dd>
        </div>
      </dl>
    {/if}
  </section>

  <section class="p-10 border-4 border-dashed">
    <Button onclick={() => (length += 5)}>zoom out</Button>
    <Button onclick={() => (length -= 5)}>zoom in</Button>

    <svg class="mt-5" width="200" height="200" viewBox="0 0 {length} {length}">
      <circle cx={length / 2} cy={length / 2} r="25" fill="skyblue" />
    </svg>
  </section>

  <section class="p-10 border-4 border-dashed">
    <h3 class="text-lg">created by javascript</h3>
    <div class="output" bind:this={outputContainer}></div>
  </section>

  <section class="p-10 border-4 border-dashed">
    <h3 class="text-lg font-bold">Scale a triangle on click</h3>
    <p class="text-sm text-slate-500">
      Click anywhere inside the SVG to scale just the green triangle; the other shapes stay fixed.
    </p>
    <svg
      width="240"
      height="160"
      viewBox="0 0 120 80"
      class="mt-4 cursor-pointer"
      onclick={toggleHighlightScale}
    >
      <rect x="8" y="12" width="104" height="56" fill="#f3f4f6" stroke="#cbd5f5" />
      <circle cx="30" cy="40" r="12" fill="#60a5fa" />
      <polygon
        points="60,24 84,64 36,64"
        fill="#22c55e"
        style:transition="transform 180ms ease"
        style:transform-box="fill-box"
        style:transform-origin="center"
        style:transform={highlightTransform}
      />
      <line x1="90" y1="20" x2="90" y2="60" stroke="#f97316" stroke-width="4" />
    </svg>
    <p class="mt-2 text-xs text-slate-500">
      Current scale: {highlightScale.toFixed(1)}×
    </p>
  </section>

  <section class="p-10 border-4 border-dashed">
    <h3>show case: stroke center</h3>
    <svg width="200" height="200" class="ml-20">
      <rect x="10" y="10" width="100" height="60" stroke-width="10" stroke="red" />
      <path d="M10 10L110 10" stroke="blue" />
      <path d="M10 10L10 70" stroke="blue" />
      <path d="M10 70L110 70" stroke="blue" />
      <path d="M110 70L110 10" stroke="blue" />
    </svg>

    <svg width="200" height="200" class="ml-20">
      <path d="M10 10L110 10" stroke="blue" stroke-width="20" />
      <path d="M10 10L110 10" stroke="red" />

      <!-- alternative drawing method -->
      <path d="M10 30L110 30L110 50L10 50Z" stroke="none" fill="blue" />
      <path d="M10 30L110 30" stroke="red" />
    </svg>
  </section>

  <section class="p-10 border-4 border-dashed">
    <h3 class="text-lg font-bold">DO NOT use 'inspect element' devtool</h3>
    <svg
      width="240"
      height="210"
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(4,4)">
        <line x1="1" y1="0" x2="1" y2="10" stroke="black" stroke-width="2" />
        <line x1="0" y1="9" x2="8" y2="9" stroke="black" stroke-width="2" />
        <line x1="7" y1="10" x2="7" y2="0" stroke="black" stroke-width="2" />
        <line x1="8" y1="2" x2="0" y2="2" stroke="#FF0000" stroke-opacity="0.5" stroke-width="4" />

        <path d="M1 0L1 10" class="stroke-cyan-800" stroke-width="0.0666667" />
        <path d="M0 9L8 9" class="stroke-cyan-600" stroke-width="0.0666667" />
        <path d="M7 10L7 0" class="stroke-cyan-400" stroke-width="0.0666667" />
        <path d="M0 1L8 1" class="stroke-cyan-200" stroke-width="0.0666667" />

        <circle cx="1" cy="1" r="0.2" fill="#58cc02" />
        <circle cx="1" cy="9" r="0.2" fill="#58cc02" />
        <circle cx="7" cy="1" r="0.2" fill="#58cc02" />
        <circle cx="7" cy="9" r="0.2" fill="#58cc02" />
      </g>

      <path
        d="M4.83097 0.772727V1.5H4.7429V0.865057H4.73864L4.56108 0.982955V0.893466L4.7429 0.772727H4.83097ZM5.12358 1.40057L5.1179 1.43892C5.11387 1.46591 5.10772 1.49479 5.09943 1.52557C5.09138 1.55634 5.08298 1.58535 5.07422 1.61257C5.06546 1.6398 5.05824 1.66146 5.05256 1.67756H4.98864C4.99171 1.66241 4.99574 1.6424 5.00071 1.61754C5.00568 1.59268 5.01065 1.56487 5.01562 1.53409C5.02083 1.50355 5.02509 1.4723 5.02841 1.44034L5.03267 1.40057H5.12358ZM5.4462 0.772727V1.5H5.35813V0.865057H5.35387L5.17631 0.982955V0.893466L5.35813 0.772727H5.4462Z"
        fill="black"
      />
      <path
        d="M10.598 1.5L10.9233 0.856534V0.850852H10.5483V0.772727H11.0142V0.855114L10.6903 1.5H10.598ZM11.148 1.40057L11.1423 1.43892C11.1383 1.46591 11.1321 1.49479 11.1238 1.52557C11.1158 1.55634 11.1074 1.58535 11.0986 1.61257C11.0899 1.6398 11.0827 1.66146 11.077 1.67756H11.0131C11.0161 1.66241 11.0202 1.6424 11.0251 1.61754C11.0301 1.59268 11.0351 1.56487 11.04 1.53409C11.0452 1.50355 11.0495 1.4723 11.0528 1.44034L11.0571 1.40057H11.148ZM11.4706 0.772727V1.5H11.3825V0.865057H11.3783L11.2007 0.982955V0.893466L11.3825 0.772727H11.4706Z"
        fill="black"
      />
      <path
        d="M0.830966 12.7727V13.5H0.742898V12.8651H0.738636L0.56108 12.983V12.8935L0.742898 12.7727H0.830966ZM1.12358 13.4006L1.1179 13.4389C1.11387 13.4659 1.10772 13.4948 1.09943 13.5256C1.09138 13.5563 1.08298 13.5853 1.07422 13.6126C1.06546 13.6398 1.05824 13.6615 1.05256 13.6776H0.988636C0.991714 13.6624 0.995739 13.6424 1.00071 13.6175C1.00568 13.5927 1.01065 13.5649 1.01562 13.5341C1.02083 13.5036 1.02509 13.4723 1.02841 13.4403L1.03267 13.4006H1.12358ZM1.50213 12.7628C1.53196 12.763 1.56179 12.7687 1.59162 12.7798C1.62145 12.791 1.64867 12.8094 1.6733 12.8352C1.69792 12.8608 1.71768 12.8957 1.7326 12.94C1.74751 12.9843 1.75497 13.0398 1.75497 13.1065C1.75497 13.1712 1.74882 13.2286 1.73651 13.2788C1.72443 13.3287 1.70691 13.3709 1.68395 13.4052C1.66122 13.4395 1.63352 13.4656 1.60085 13.4833C1.56842 13.5011 1.53172 13.5099 1.49077 13.5099C1.45005 13.5099 1.41371 13.5019 1.38175 13.4858C1.35002 13.4695 1.32398 13.4469 1.30362 13.418C1.2835 13.3888 1.2706 13.3551 1.26491 13.3168H1.35156C1.35938 13.3501 1.37488 13.3777 1.39808 13.3995C1.42152 13.421 1.45241 13.4318 1.49077 13.4318C1.54688 13.4318 1.59115 13.4073 1.62358 13.3583C1.65625 13.3093 1.67259 13.2401 1.67259 13.1506H1.6669C1.65365 13.1705 1.6379 13.1876 1.61967 13.2021C1.60144 13.2165 1.5812 13.2276 1.55895 13.2354C1.5367 13.2433 1.51302 13.2472 1.48793 13.2472C1.44626 13.2472 1.40803 13.2369 1.37322 13.2163C1.33866 13.1954 1.31096 13.1669 1.29013 13.1307C1.26953 13.0942 1.25923 13.0526 1.25923 13.0057C1.25923 12.9612 1.26918 12.9205 1.28906 12.8835C1.30919 12.8464 1.33736 12.8168 1.37358 12.7947C1.41004 12.7727 1.45289 12.7621 1.50213 12.7628ZM1.50213 12.8409C1.4723 12.8409 1.44543 12.8484 1.42152 12.8633C1.39785 12.878 1.37902 12.8978 1.36506 12.9229C1.35133 12.9478 1.34446 12.9754 1.34446 13.0057C1.34446 13.036 1.35109 13.0636 1.36435 13.0884C1.37784 13.113 1.39619 13.1327 1.41939 13.1474C1.44283 13.1618 1.46946 13.169 1.49929 13.169C1.52178 13.169 1.54273 13.1647 1.56214 13.1559C1.58156 13.1469 1.59848 13.1347 1.61293 13.1193C1.6276 13.1037 1.63909 13.0861 1.64737 13.0664C1.65566 13.0465 1.6598 13.0258 1.6598 13.0043C1.6598 12.9759 1.65294 12.9492 1.6392 12.9244C1.62571 12.8995 1.60701 12.8794 1.5831 12.864C1.55942 12.8486 1.53243 12.8409 1.50213 12.8409Z"
        fill="black"
      />
      <path
        d="M14.098 13.5L14.4233 12.8565V12.8509H14.0483V12.7727H14.5142V12.8551L14.1903 13.5H14.098ZM14.648 13.4006L14.6423 13.4389C14.6383 13.4659 14.6321 13.4948 14.6238 13.5256C14.6158 13.5563 14.6074 13.5853 14.5986 13.6126C14.5899 13.6398 14.5827 13.6615 14.577 13.6776H14.5131C14.5161 13.6624 14.5202 13.6424 14.5251 13.6175C14.5301 13.5927 14.5351 13.5649 14.54 13.5341C14.5452 13.5036 14.5495 13.4723 14.5528 13.4403L14.5571 13.4006H14.648ZM15.0265 12.7628C15.0564 12.763 15.0862 12.7687 15.116 12.7798C15.1459 12.791 15.1731 12.8094 15.1977 12.8352C15.2223 12.8608 15.2421 12.8957 15.257 12.94C15.2719 12.9843 15.2794 13.0398 15.2794 13.1065C15.2794 13.1712 15.2732 13.2286 15.2609 13.2788C15.2488 13.3287 15.2313 13.3709 15.2084 13.4052C15.1856 13.4395 15.1579 13.4656 15.1253 13.4833C15.0928 13.5011 15.0561 13.5099 15.0152 13.5099C14.9745 13.5099 14.9381 13.5019 14.9062 13.4858C14.8744 13.4695 14.8484 13.4469 14.828 13.418C14.8079 13.3888 14.795 13.3551 14.7893 13.3168H14.876C14.8838 13.3501 14.8993 13.3777 14.9225 13.3995C14.9459 13.421 14.9768 13.4318 15.0152 13.4318C15.0713 13.4318 15.1156 13.4073 15.148 13.3583C15.1807 13.3093 15.197 13.2401 15.197 13.1506H15.1913C15.1781 13.1705 15.1623 13.1876 15.1441 13.2021C15.1259 13.2165 15.1056 13.2276 15.0834 13.2354C15.0611 13.2433 15.0374 13.2472 15.0123 13.2472C14.9707 13.2472 14.9324 13.2369 14.8976 13.2163C14.8631 13.1954 14.8354 13.1669 14.8145 13.1307C14.7939 13.0942 14.7836 13.0526 14.7836 13.0057C14.7836 12.9612 14.7936 12.9205 14.8135 12.8835C14.8336 12.8464 14.8618 12.8168 14.898 12.7947C14.9345 12.7727 14.9773 12.7621 15.0265 12.7628ZM15.0265 12.8409C14.9967 12.8409 14.9698 12.8484 14.9459 12.8633C14.9223 12.878 14.9034 12.8978 14.8895 12.9229C14.8757 12.9478 14.8689 12.9754 14.8689 13.0057C14.8689 13.036 14.8755 13.0636 14.8888 13.0884C14.9023 13.113 14.9206 13.1327 14.9438 13.1474C14.9672 13.1618 14.9939 13.169 15.0237 13.169C15.0462 13.169 15.0671 13.1647 15.0866 13.1559C15.106 13.1469 15.1229 13.1347 15.1373 13.1193C15.152 13.1037 15.1635 13.0861 15.1718 13.0664C15.1801 13.0465 15.1842 13.0258 15.1842 13.0043C15.1842 12.9759 15.1773 12.9492 15.1636 12.9244C15.1501 12.8995 15.1314 12.8794 15.1075 12.864C15.0838 12.8486 15.0568 12.8409 15.0265 12.8409Z"
        fill="black"
      />
      <path
        d="M4.92927 4.9503C4.96833 4.98935 5.03164 4.98935 5.0707 4.9503L5.7071 4.31391C5.74615 4.27485 5.74615 4.21154 5.7071 4.17248C5.66804 4.13343 5.60473 4.13343 5.56567 4.17248L4.99999 4.73817L4.4343 4.17248C4.39525 4.13342 4.33193 4.13342 4.29288 4.17248C4.25383 4.21153 4.25383 4.27485 4.29288 4.3139L4.92927 4.9503ZM5 2L4.9 2L4.89999 4.87959L4.99999 4.87959L5.09999 4.87959L5.1 2L5 2Z"
        fill="#9747FF"
      />
      <path
        d="M10.9293 4.9503C10.9683 4.98935 11.0316 4.98935 11.0707 4.9503L11.7071 4.31391C11.7461 4.27485 11.7461 4.21154 11.7071 4.17248C11.668 4.13343 11.6047 4.13343 11.5657 4.17248L11 4.73817L10.4343 4.17248C10.3953 4.13342 10.3319 4.13342 10.2929 4.17248C10.2538 4.21153 10.2538 4.27485 10.2929 4.3139L10.9293 4.9503ZM11 2L10.9 2L10.9 4.87959L11 4.87959L11.1 4.87959L11.1 2L11 2Z"
        fill="#9747FF"
      />
      <path
        d="M4.9503 13.0707C4.98935 13.0317 4.98935 12.9683 4.9503 12.9293L4.3139 12.2929C4.27485 12.2538 4.21153 12.2538 4.17248 12.2929C4.13343 12.3319 4.13343 12.3953 4.17248 12.4343L4.73817 13L4.17248 13.5657C4.13343 13.6047 4.13343 13.6681 4.17248 13.7071C4.21153 13.7462 4.27485 13.7462 4.3139 13.7071L4.9503 13.0707ZM2 13V13.1H4.87959V13V12.9H2V13Z"
        fill="#9747FF"
      />
      <path
        d="M10.9293 12.9293C10.8903 12.9683 10.8903 13.0317 10.9293 13.0707L11.5657 13.7071C11.6048 13.7462 11.6681 13.7462 11.7072 13.7071C11.7462 13.6681 11.7462 13.6047 11.7072 13.5657L11.1415 13L11.7072 12.4343C11.7462 12.3953 11.7462 12.3319 11.7072 12.2929C11.6681 12.2538 11.6048 12.2538 11.5657 12.2929L10.9293 12.9293ZM13.8796 13V12.9H11.0001V13V13.1H13.8796V13Z"
        fill="#9747FF"
      />
    </svg>

    <p class="mt-5">arrows are created in Figma</p>
  </section>

  <section class="p-10 border-4 border-dashed">
    <h3 class="text-lg font-bold">click me</h3>

    <svg
      width="200"
      height="180"
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="180" width="20" height="180" fill="#333333" />
      <rect width="20" height="180" fill="#333333" />

      <rect
        width="200"
        height="70"
        fill="#F3F3F3"
        onclick={() => (showWhich = (showWhich + 1) % 4)}
      />
      {#if showWhich & 0x01}
        <path
          d="M0 0L0 70L100 70L100 0z"
          fill="#2CA900"
          stroke="none"
          onclick={() => (showWhich = (showWhich + 1) % 4)}
          transition:fly={{ y: 20, duration: 500 }}
        />
      {/if}
      {#if showWhich & 0x02}
        <path
          d="M100 0L100 70L200 70L200 0z"
          fill="#FFBB59"
          stroke="none"
          onclick={() => (showWhich = (showWhich + 1) % 4)}
          transition:fade
        />
      {/if}
    </svg>
  </section>

  <section class="p-10 border-4 border-dashed">
    <div class="text-red-500">
      <svg
        width="200"
        height="180"
        viewBox="0 0 200 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text class="note" x="10" y="50" stroke="none" fill="currentColor"
          >This is colored by css</text
        >
        <text class="note" x="10" y="80" stroke="none" fill="currentColor"
          >'color' property and</text
        >
        <text class="note" x="10" y="110" stroke="none" fill="currentColor"
          >fill="currentColor"</text
        >
      </svg>
    </div>
  </section>

  <section class="p-10 border-4 border-dashed">
    <h3 class="text-lg font-bold">polygon demo</h3>
    <svg
      width="200"
      height="180"
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="40,60 40,90 120,140 120,110" stroke="none" fill="cyan" />
    </svg>
  </section>

  <section class="p-10 border-4 border-dashed">
    <h3 class="text-lg font-bold">rect with stroke-width</h3>
    <div class="relative">
      <svg
        width="200"
        height="180"
        viewBox="0 0 200 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="20" y="20" width="100" height="60" stroke-width="20" stroke="blue" />
      </svg>
      <div class="dom-rect absolute w-[100px] h-[60px] left-[20px] top-[20px] bg-teal-500">
        dom rect
      </div>
    </div>
    <p>the actual visual width of svg rectangle is (100 + 20) = 120px</p>
  </section>
  <section class="p-10 border-4 border-dashed">
    <h3 class="text-lg font-bold">rect with stroke-width</h3>
    <svg
      width="200"
      height="180"
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="1" height="180" stroke="none" fill="blue" />
      <path d="M10 60L110 60" stroke-width="20" stroke="teal" />
      <rect x="10" y="60" width="100" height="100" fill="red" opacity="0.6" />
    </svg>

    <p>open devtool and select <b>path</b> line</p>
  </section>
</main>
