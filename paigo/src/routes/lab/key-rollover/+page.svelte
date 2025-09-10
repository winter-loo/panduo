<script lang="ts">
  import { onMount } from 'svelte';

  // Settings and state (Svelte 5 runes)
  const settings = $state({ preventDefault: true, useCapture: false });
  let pressed = $state(new Set<string>());
  let maxPressed = $state(0);

  function reset() {
    pressed = new Set();
    maxPressed = 0;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (settings.preventDefault) e.preventDefault();
    if (e.repeat) return; // ignore auto-repeat
    const code = e.code || `Key(${e.key})`;
    if (!pressed.has(code)) {
      pressed.add(code);
      // Reassign to trigger reactivity with Set
      pressed = new Set(pressed);
      if (pressed.size > maxPressed) maxPressed = pressed.size;
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (settings.preventDefault) e.preventDefault();
    const code = e.code || `Key(${e.key})`;
    if (pressed.has(code)) {
      pressed.delete(code);
      pressed = new Set(pressed);
    }
  }

  // Bind listeners; rebind when capture mode changes
  $effect(() => {
    const capture = settings.useCapture;
    window.addEventListener('keydown', handleKeyDown, { capture });
    window.addEventListener('keyup', handleKeyUp, { capture });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture });
      window.removeEventListener('keyup', handleKeyUp, { capture });
    };
  });

  onMount(() => {
    // Focus the test area on mount for convenience
    setTimeout(() => (testArea?.focus()), 0);
  });

  let testArea: HTMLDivElement | null = null;
</script>

<h3>Keyboard Rollover Test</h3>

<div class="controls">
  <label><input type="checkbox" bind:checked={settings.preventDefault} /> preventDefault</label>
  <label><input type="checkbox" bind:checked={settings.useCapture} /> capture</label>
  <button on:click={reset}>Reset</button>
  <a class="back" href="/lab">← back to lab</a>
  <style>
    .back { margin-left: auto; }
  </style>
  
</div>

<div class="stats">
  <div><strong>Currently pressed:</strong> {pressed.size}</div>
  <div><strong>Max simultaneous:</strong> {maxPressed}</div>
  <div class="hint">Tip: some OS/browser shortcuts don’t reach the page; focus the test box.</div>
  <div class="hint">Try rows (ASDF, numbers, arrows) to probe ghosting.</div>
  
</div>

<div
  class="test-area"
  tabindex="0"
  bind:this={testArea}
  aria-label="Keyboard test area"
>
  {#if pressed.size === 0}
    <div class="placeholder">Press and hold multiple keys…</div>
  {/if}
  {#each Array.from(pressed).sort() as code}
    <span class="key-chip">{code}</span>
  {/each}
  <div class="note">Keys are tracked by <code>event.code</code> (physical key).</div>
  <div class="note">Release all keys to settle the count; use Reset to clear max.</div>
  <div class="legend">
    <span class="chip-swatch"></span> currently held keys
  </div>
  <div class="focus-tip">Ensure this box has focus for best results.</div>
  <div class="focus-ring" aria-hidden="true"></div>
  <style>
    .focus-ring { display: none; }
    .test-area:focus .focus-ring { display: none; }
  </style>
</div>

<style>
  h3 { margin: 16px; }

  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
    margin: 0 16px 8px;
  }
  .controls label { user-select: none; }

  .stats { margin: 0 16px 12px; color: #222; }
  .stats .hint { color: #666; font-size: 12px; }

  .test-area {
    margin: 0 16px 24px;
    min-height: 180px;
    padding: 16px;
    border-radius: 8px;
    border: 2px dashed #9aa3b1;
    background: #f7f9fc;
    outline: none;
    position: relative;
  }
  .test-area:focus {
    border-color: #6b8cff;
    background: #f2f6ff;
  }
  .placeholder { color: #7a8699; margin-bottom: 8px; }

  .key-chip {
    display: inline-block;
    margin: 6px;
    padding: 8px 10px;
    border-radius: 6px;
    background: #e3e9ff;
    color: #243b7a;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06);
  }

  .note { margin-top: 12px; color: #546e7a; font-size: 12px; }
  .legend { margin-top: 8px; color: #546e7a; font-size: 12px; display: flex; align-items: center; gap: 6px; }
  .chip-swatch { width: 14px; height: 14px; background: #e3e9ff; border-radius: 4px; display: inline-block; }
  .focus-tip { margin-top: 8px; color: #7a8699; font-size: 12px; }
</style>

