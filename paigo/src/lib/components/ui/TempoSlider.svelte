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

  function handleArrowPointerDown(event: PointerEvent, direction: 1 | -1) {
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
      onpointerdown={(event) => handleArrowPointerDown(event, 1)}
    >
      <svg width="18" height="18.75" viewBox="0 0 18 18.75" aria-hidden="true">
        <path d="M9 3 15 9.75 3 9.75Z" fill="#888888" />
      </svg>
    </button>
    <button
      type="button"
      class="tempo-slider__control-button"
      aria-label="Decrease tempo"
      onpointerdown={(event) => handleArrowPointerDown(event, -1)}
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
    position: relative;
    display: inline-flex;
    align-items: stretch;
    background: #f3f3f3;
    border-radius: 24px;
    box-shadow: 0 4px 4px rgba(0, 0, 0, 0.25), 0 -4px 4px rgba(255, 255, 255, 1);
    overflow: hidden;
    color: #4d4d4d;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-width: 150px;
    height: 48px;
  }

  .tempo-slider__display {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    padding-left: 24px;
    padding-right: 8px;
    font-size: 24px;
    line-height: 1.2;
    cursor: ns-resize;
    user-select: none;
  }

  .tempo-slider__controls {
    display: flex;
    flex-direction: column;
    width: 24px;
    background: transparent;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }

  .tempo-slider__control-button {
    flex: 1;
    width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border: none;
    padding: 0;
    cursor: pointer;
    box-shadow: inset 0 2px 2px rgba(204, 204, 204, 1), inset 0 -2px 2px rgba(204, 204, 204, 1);
    transition: background 0.15s ease;
  }

  .tempo-slider__control-button + .tempo-slider__control-button {
    border-top: 1px solid rgba(204, 204, 204, 0.5);
  }

  .tempo-slider:hover {
    border-radius: 24px 0 0 24px;
  }

  .tempo-slider:hover .tempo-slider__controls {
    opacity: 1;
    pointer-events: auto;
  }

  .tempo-slider__control-button:first-child {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .tempo-slider__control-button:last-child {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .tempo-slider__control-button:hover,
  .tempo-slider__control-button:focus-visible {
    background: #f7f7f7;
  }

  .tempo-slider__control-button svg {
    pointer-events: none;
  }
</style>
