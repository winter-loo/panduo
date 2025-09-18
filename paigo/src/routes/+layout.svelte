<script lang="ts">
  import PianoLoadingOverlay from '$lib/ui/PianoLoadingOverlay.svelte';
  import { Button } from '$lib/components/ui/button/index';
  import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
  import { navigationMenuTriggerStyle } from '$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte';
  import '../app.css';

  let { children } = $props();

  // Organize all UI state in a single object
  const S = $state({
    grid: {
      unit: 10,
      width: 800,
      visible: false,
    },
    mouse: {
      x: 0,
      y: 0,
    },
  });

  console.log('layout page loading...');

  let containerElement: HTMLDivElement;
  const gridHeight = 300;

  // Reactive grid generation
  const D = $derived({
    grid: {
      vlines: generateVerticalLines(S.grid.unit, S.grid.width, gridHeight),
      hlines: generateHorizontalLines(S.grid.unit, S.grid.width, gridHeight),
      labels: generateCoordinateLabels(S.grid.unit, S.grid.width, gridHeight),
    },
  });

  function generateVerticalLines(size: number, width: number, height: number) {
    const lines = [];
    for (let x = 0; x <= width; x += size) {
      lines.push({
        x1: x,
        y1: 0,
        x2: x,
        y2: height,
        stroke: x % (size * 5) === 0 ? '#ff0000' : '#cccccc',
        strokeWidth: x % (size * 5) === 0 ? '1' : '0.5',
      });
    }
    return lines;
  }

  function generateHorizontalLines(size: number, width: number, height: number) {
    const lines = [];
    for (let y = 0; y <= height; y += size) {
      lines.push({
        x1: 0,
        y1: y,
        x2: width,
        y2: y,
        stroke: y % (size * 5) === 0 ? '#ff0000' : '#cccccc',
        strokeWidth: y % (size * 5) === 0 ? '1' : '0.5',
      });
    }
    return lines;
  }

  function generateCoordinateLabels(size: number, width: number, height: number) {
    const labels = [];

    // X-axis labels
    for (let x = 0; x <= width; x += size * 5) {
      labels.push({
        x: x + 2,
        y: 12,
        text: x.toString(),
        type: 'x',
      });
    }

    // Y-axis labels
    for (let y = size * 5; y <= height; y += size * 5) {
      labels.push({
        x: 2,
        y: y - 2,
        text: y.toString(),
        type: 'y',
      });
    }

    return labels;
  }

  function toggleGrid() {
    S.grid.visible = !S.grid.visible;
  }

  function changeGridSize(size: number) {
    S.grid.unit = size;
  }

  function showCursorPosition(e: MouseEvent) {
    if (!containerElement) return;

    const rect = containerElement.getBoundingClientRect();
    S.mouse.x = Math.round(e.clientX - rect.left);
    S.mouse.y = Math.round(e.clientY - rect.top);
  }

  function updateGridWidth() {
    if (containerElement) {
      S.grid.width = containerElement.offsetWidth || window.innerWidth - 40;
    }
  }

  // Update grid width when container size changes
  $effect(() => {
    if (containerElement) {
      updateGridWidth();
      const resizeObserver = new ResizeObserver(updateGridWidth);
      resizeObserver.observe(containerElement);

      return () => resizeObserver.disconnect();
    }
  });
</script>

<NavigationMenu.Root viewport={false}>
  <NavigationMenu.List>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/" class={navigationMenuTriggerStyle()}>home</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/keyboard" class={navigationMenuTriggerStyle()}>keyboard</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/rect" class={navigationMenuTriggerStyle()}>rect</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/lab" class={navigationMenuTriggerStyle()}>lab</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/sight-reading" class={navigationMenuTriggerStyle()}>sight reading</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  </NavigationMenu.List>
</NavigationMenu.Root>

<PianoLoadingOverlay />

<div class="controls">
  <Button onclick={toggleGrid}>Toggle Grid</Button>
  <Button onclick={() => changeGridSize(5)}>5px Grid</Button>
  <Button onclick={() => changeGridSize(10)}>10px Grid</Button>
  <Button onclick={() => changeGridSize(20)}>20px Grid</Button>
  <span>Grid: {S.grid.unit}px | Mouse: ({S.mouse.x}, {S.mouse.y})</span>
</div>

<div
  bind:this={containerElement}
  id="container"
  onmousemove={showCursorPosition}
  role="application"
  aria-label="Music notation grid with cursor tracking"
>
  <svg
    id="grid"
    width={S.grid.width}
    height={gridHeight}
    style:display={S.grid.visible ? 'block' : 'none'}
  >
    {#each D.grid.vlines as line}
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        stroke={line.stroke}
        stroke-width={line.strokeWidth}
      />
    {/each}

    {#each D.grid.hlines as line}
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        stroke={line.stroke}
        stroke-width={line.strokeWidth}
      />
    {/each}

    {#each D.grid.labels as label}
      <text x={label.x} y={label.y} font-size="10" fill="#666">
        {label.text}
      </text>
    {/each}
  </svg>
  {@render children?.()}

  <style>
    #container {
      position: relative;
      min-height: 300px;
    }

    #grid {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 1;
      opacity: 0.3;
    }
  </style>
</div>
