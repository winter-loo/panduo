<script lang="ts">
  import { onDestroy } from 'svelte';

  let { min = 40, max = 200, step = 5, value = $bindable<number>() } = $props();

  const PX_PER_STEP = 6;
  const HOLD_DELAY_MS = 300;
  const HOLD_INTERVAL_MS = 75;

  let dragging = $state(false);
  let startY = 0;
  let startValue = 0;
  let holdTimeout: number | undefined;
  let holdInterval: number | undefined;

  value = normalize(value);

  function beginDrag(event: PointerEvent) {
    event.preventDefault();
    startY = event.clientY;
    startValue = value;
    dragging = true;
    setGlobalCursor(true);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging) return;
    event.preventDefault();
    const deltaY = startY - event.clientY;
    const stepSize = Math.max(1, step);
    const raw = startValue + (deltaY / PX_PER_STEP) * stepSize;
    const snapped = Math.round(raw / stepSize) * stepSize;
    value = normalize(snapped);
  }

  function handlePointerUp(event?: PointerEvent) {
    if (!dragging && !holdTimeout && !holdInterval) return;
    event?.preventDefault();
    dragging = false;
    clearHoldTimers();
    setGlobalCursor(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  function normalize(v: number) {
    const stepSize = Math.max(1, step);
    const clamped = Math.min(max, Math.max(min, v));
    return Math.round(clamped / stepSize) * stepSize;
  }

  function adjust(delta: number) {
    value = normalize(value + delta * Math.max(1, step));
  }

  function changeTempo(event: PointerEvent, direction: 1 | -1) {
    event.preventDefault();
    handlePointerUp();
    adjust(direction);
    clearHoldTimers();
    holdTimeout = window.setTimeout(() => {
      holdInterval = window.setInterval(() => adjust(direction), HOLD_INTERVAL_MS);
    }, HOLD_DELAY_MS);
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
  }

  function clearHoldTimers() {
    if (holdTimeout) {
      window.clearTimeout(holdTimeout);
      holdTimeout = undefined;
    }
    if (holdInterval) {
      window.clearInterval(holdInterval);
      holdInterval = undefined;
    }
  }

  function setGlobalCursor(active: boolean) {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('tempo-slider--dragging', active);
  }

  onDestroy(() => {
    clearHoldTimers();
    setGlobalCursor(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  });
</script>

<div class="tempo-slider">
  <div
    class="tempo-slider__display"
    onpointerdown={beginDrag}
    role="slider"
    aria-label="Tempo"
    tabindex="0"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    onkeydown={(event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        event.preventDefault();
        adjust(1);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        event.preventDefault();
        adjust(-1);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        adjust(5);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        adjust(-5);
      } else if (event.key === 'Home') {
        event.preventDefault();
        value = normalize(min);
      } else if (event.key === 'End') {
        event.preventDefault();
        value = normalize(max);
      }
    }}
  >
    <span class="tempo-slider__label">BPM</span>
    <span class="tempo-slider__value">{value}</span>
  </div>
  <div class="tempo-slider__controls" aria-hidden="true">
    <button
      type="button"
      class="tempo-slider__control-button"
      aria-label="Increase tempo"
      onpointerdown={(event) => changeTempo(event, 1)}
    >
      <svg width="18" height="18.75" viewBox="0 0 18 18.75" aria-hidden="true">
        <path d="M9 3 15 9.75 3 9.75Z" fill="#888888" />
      </svg>
    </button>
    <button
      type="button"
      class="tempo-slider__control-button"
      aria-label="Decrease tempo"
      onpointerdown={(event) => changeTempo(event, -1)}
    >
      <svg width="18" height="18.75" viewBox="0 0 18 18.75" aria-hidden="true">
        <path d="M9 15.75 3 9 15 9Z" fill="#888888" />
      </svg>
    </button>
  </div>
</div>

<style>
  :global(body.tempo-slider--dragging),
  :global(body.tempo-slider--dragging *) {
    cursor: ns-resize !important;
  }

  .tempo-slider {
    --button-text-font-size: 24px;
    position: relative;
    display: inline-flex;
    background: #f3f3f3;
    border-radius: var(--button-text-font-size);
    overflow: hidden;
    color: #4d4d4d;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: border-radius 0.15s ease;
  }

  .tempo-slider__display {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    padding-left: var(--button-text-font-size);
    font-size: var(--button-text-font-size);
    line-height: 1.2;
    cursor: ns-resize;
    user-select: none;
  }

  .tempo-slider__controls {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    width: var(--button-text-font-size);
    background: transparent;
    opacity: 0;
    pointer-events: none;
  }

  .tempo-slider__control-button {
    width: calc(var(--button-text-font-size) - 2px);
    height: calc(var(--button-text-font-size) - 2px);
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f3f3;
    border: none;
    padding: 0;
    cursor: pointer;
    box-shadow: inset 0.5px 0.5px 0 rgba(204, 204, 204, 1), inset -0.5px -0.5px 0 rgba(243, 243, 243, 0.6);
    transition: background 0.15s ease;
  }

  .tempo-slider:hover {
    border-radius: var(--button-text-font-size) 0 0 var(--button-text-font-size);
    box-shadow: 0 4px 4px rgba(204, 204, 204, 1), 0 -4px 4px rgba(255, 255, 255, 1);
  }

  .tempo-slider:hover .tempo-slider__controls {
    opacity: 1;
    pointer-events: auto;
  }

  .tempo-slider__control-button:hover,
  .tempo-slider__control-button:focus-visible {
    background: #fafafa;
  }
  .tempo-slider__control-button:active {
    background: #fefefe;
  }

  .tempo-slider__control-button svg {
    pointer-events: none;
  }

  .tempo-slider__value {
    min-width: calc(var(--button-text-font-size) * 2);
  }
</style>
