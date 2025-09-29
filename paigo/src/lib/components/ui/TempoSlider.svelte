<script lang="ts">
  import { onDestroy } from 'svelte';

  let { min = 40, max = 200, step = 5, value = $bindable<number>() } = $props();

  const PX_PER_STEP = 6;

  let isHovering = $state(false);
  let dragging = $state(false);
  let startY = 0;
  let startValue = 0;

  const showHoverCue = $derived(() => isHovering || dragging);

  function beginDrag(event: PointerEvent) {
    event.preventDefault();
    startY = event.clientY;
    startValue = value;
    if (!dragging) {
      dragging = true;
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    setGlobalCursor(true);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging) return;
    setGlobalCursor(true);
    const deltaY = startY - event.clientY;
    const stepSize = step > 0 ? step : 1;
    const raw = startValue + (deltaY / PX_PER_STEP) * stepSize;
    const snapped = Math.round(raw / stepSize) * stepSize;
    value = clamp(snapped, min, max);
  }

  function handlePointerUp() {
    if (!dragging) return;
    dragging = false;
    setGlobalCursor(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  function clamp(v: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, v));
  }

  function setGlobalCursor(active: boolean) {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = active ? 'ns-resize' : '';
  }

  onDestroy(() => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    setGlobalCursor(false);
  });
</script>

<div class="tempo-chooser">
  <button
    type="button"
    class="tempo-chooser__button"
    class:tempo-chooser__button--hover={showHoverCue}
    onpointerdown={beginDrag}
    onpointerenter={() => (isHovering = true)}
    onpointerleave={() => (isHovering = false)}
  >
    BPM {value}
  </button>
</div>

<style>
  .tempo-chooser {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .tempo-chooser__button {
    background: none;
    border: none;
    font: inherit;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    transition: background 0.2s ease;
    cursor: default;
    color: inherit;
    user-select: none;
  }

  .tempo-chooser__button--hover {
    background: color-mix(in srgb, currentColor 12%, transparent);
    cursor: ns-resize;
  }
</style>
