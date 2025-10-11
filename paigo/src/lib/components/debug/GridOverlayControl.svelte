<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button/index';
  import type { DebugGridOptions } from '$lib/vexflow/vexflow-core';

  let { enabled = $bindable(false), options = $bindable({}) } = $props();

  let initialOptions = structuredClone(options);

  const minSpacing = $derived(options.minSpacing ?? 2);

  let menuOpen = $state(false);
  let container: HTMLDivElement | null = null;

  function emitOptions(next: DebugGridOptions) {
    options = { ...next };
  }

  function toggleGrid() {
    enabled = !enabled;
    menuOpen = false;
  }

  function toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    menuOpen = !menuOpen;
  }

  function handleSpacingInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const rawValue = Number.parseFloat(target.value);
    const spacing = Number.isFinite(rawValue)
      ? Math.max(minSpacing, rawValue)
      : (options.spacing ?? minSpacing);
    target.value = spacing.toString();
    const majorSpacing = Math.max(spacing, options.majorSpacing ?? spacing);
    emitOptions({
      ...options,
      spacing,
      majorSpacing,
    });
  }

  function handleMajorSpacingInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const rawValue = Number.parseFloat(target.value);
    const baseSpacing = options.spacing ?? minSpacing;
    const majorSpacing = Number.isFinite(rawValue)
      ? Math.max(baseSpacing, rawValue)
      : (options.majorSpacing ?? baseSpacing);
    target.value = majorSpacing.toString();
    emitOptions({
      ...options,
      majorSpacing,
    });
  }

  function handleShowLabelsChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    emitOptions({
      ...options,
      showLabels: target.checked,
    });
  }

  function handleMajorOnlyChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    emitOptions({
      ...options,
      labelMajorLinesOnly: target.checked,
    });
  }

  function handleOriginLabelsChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    emitOptions({
      ...options,
      includeOriginLabels: target.checked,
    });
  }

  function resetToDefaults() {
    emitOptions({ ...initialOptions });
  }

  onMount(() => {
    function handleWindowClick(event: MouseEvent) {
      if (!menuOpen) return;
      const target = event.target as Node | null;
      if (container && target && container.contains(target)) return;
      menuOpen = false;
    }

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  });
</script>

<div class="grid-toggle" bind:this={container}>
  <Button id="gridButton" type="button" onclick={toggleGrid}>
    {enabled ? 'hide grid' : 'show grid'}
  </Button>
  <Button
    id="gridMenuButton"
    class="grid-toggle__caret"
    type="button"
    aria-haspopup="true"
    aria-expanded={menuOpen}
    onclick={toggleMenu}
  >
    <span aria-hidden="true">▾</span>
    <span class="sr-only">Configure grid overlay</span>
  </Button>
  {#if menuOpen}
    <div class="grid-toggle__menu" role="menu">
      <label>
        <span>Spacing (px)</span>
        <input
          type="number"
          min={minSpacing}
          step="1"
          value={options.spacing ?? minSpacing}
          onchange={handleSpacingInput}
        />
      </label>
      <label>
        <span>Major spacing (px)</span>
        <input
          type="number"
          min={Math.max(minSpacing, options.spacing ?? minSpacing)}
          step="1"
          value={options.majorSpacing ?? options.spacing ?? minSpacing}
          onchange={handleMajorSpacingInput}
        />
      </label>
      <div class="checkbox-row">
        <input
          id="show-labels"
          type="checkbox"
          checked={options.showLabels ?? true}
          onchange={handleShowLabelsChange}
        />
        <label for="show-labels">Show labels</label>
      </div>
      <div class="checkbox-row">
        <input
          id="label-major"
          type="checkbox"
          checked={options.labelMajorLinesOnly ?? false}
          onchange={handleMajorOnlyChange}
        />
        <label for="label-major">Labels on major lines only</label>
      </div>
      <div class="checkbox-row">
        <input
          id="origin-labels"
          type="checkbox"
          checked={options.includeOriginLabels ?? true}
          onchange={handleOriginLabelsChange}
        />
        <label for="origin-labels">Include origin labels</label>
      </div>
      <footer>
        <Button type="button" onclick={resetToDefaults}>Reset defaults</Button>
      </footer>
    </div>
  {/if}
</div>

<style>
  .grid-toggle {
    position: relative;
    display: flex;
    gap: 0.25rem;
    align-items: stretch;
  }

  .grid-toggle__menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    min-width: 220px;
    padding: 0.75rem;
    border: 1px solid #d0d0d0;
    border-radius: 0.5rem;
    background: #fff;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    z-index: 5;
  }

  .grid-toggle__menu label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }

  .grid-toggle__menu input[type='number'] {
    padding: 0.25rem 0.4rem;
    border: 1px solid #c0c0c0;
    border-radius: 0.3rem;
    font-size: 0.9rem;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .grid-toggle__menu footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>
