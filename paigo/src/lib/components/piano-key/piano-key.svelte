<script lang="ts">
  export type PianoKeyName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  export type PianoKeyFullname = {
    name: PianoKeyName;
    octave: number;
    hideBlack?: boolean;
    onnoteon?: (name: string, octave: number) => void;
    onnoteoff?: (name: string, octave: number) => void;
  };
  let { name, octave, hideBlack = false, onnoteon, onnoteoff }: PianoKeyFullname = $props();

  const RELEASE_DELAY_MS = 60;

  let whitePressed = $state(false);
  let whiteReleaseTimer: ReturnType<typeof setTimeout> | null = null;

  let blackPressed = $state(false);
  let blackReleaseTimer: ReturnType<typeof setTimeout> | null = null;

  function startWhitePress(name: string, octave: number, event?: PointerEvent) {
    if (whiteReleaseTimer) {
      clearTimeout(whiteReleaseTimer);
      whiteReleaseTimer = null;
    }
    if (event) {
      (event.currentTarget as HTMLButtonElement | null)?.setPointerCapture?.(event.pointerId);
    }
    whitePressed = true;
    onnoteon?.(name, octave);
  }

  function endWhitePress(name: PianoKeyName, octave: number) {
    if (whiteReleaseTimer) {
      clearTimeout(whiteReleaseTimer);
      whiteReleaseTimer = null;
    }
    whiteReleaseTimer = setTimeout(() => {
      whitePressed = false;
      whiteReleaseTimer = null;
      onnoteoff?.(name, octave);
    }, RELEASE_DELAY_MS);
  }

  function startBlackPress(name: string, octave: number, event?: PointerEvent) {
    if (blackReleaseTimer) {
      clearTimeout(blackReleaseTimer);
      blackReleaseTimer = null;
    }
    if (event) {
      (event.currentTarget as HTMLButtonElement | null)?.setPointerCapture?.(event.pointerId);
    }
    blackPressed = true;
    onnoteon?.(name, octave);
  }

  function endBlackPress(name: string, octave: number) {
    if (blackReleaseTimer) {
      clearTimeout(blackReleaseTimer);
      blackReleaseTimer = null;
    }
    blackReleaseTimer = setTimeout(() => {
      blackPressed = false;
      blackReleaseTimer = null;
      onnoteoff?.(name, octave);
    }, RELEASE_DELAY_MS);
  }
</script>

<!--
  use 'py-2 pl-1' to have exactly width taken visually by this piano key, i.e.,
  to include shadow spacing
-->
<div class="piano-key relative py-2 pl-1" data-name={name} data-octave={octave}>
  <!-- lesson leart: on active, do not remove the second shadow even it has the same value as the first one. -->
  <!-- Instead, change only what should be changed -->
  <button
    class={`white-key ease z-1
    flex h-48 w-18 items-end justify-center rounded-sm bg-white
    text-[var(--note-default)]
    shadow-[0_0_0_var(--spacing)_var(--border),0_var(--spacing)_0_var(--spacing)_var(--border)]
    transition-all
    duration-200
    hover:bg-[var(--key-hover)]
    active:translate-y-1
    active:bg-[var(--key-active)]
    active:shadow-[0_0_0_var(--spacing)_var(--border),0_0_0_var(--spacing)_var(--border)]
    ${whitePressed ? 'translate-y-1 bg-[var(--key-active)] shadow-[0_0_0_var(--spacing)_var(--border),0_0_0_var(--spacing)_var(--border)]' : ''}`}
    onpointerdown={(e) => startWhitePress(name, octave, e)}
    onpointerup={() => endWhitePress(name, octave)}
  >
    {name + octave.toString()}
  </button>
  {#if name != 'E' && name != 'B' && !hideBlack}
    <button
      class={`black-key ease absolute top-0 left-11 z-2 flex h-24
      w-13 items-end justify-center rounded-sm
      bg-[var(--note-default-500)]
      text-white
      shadow-[0_calc(var(--spacing)*2)_0_var(--note-default-100)] transition-all
      duration-200 hover:bg-[var(--note-default-300)] active:top-1
      active:bg-[var(--note-default-100)] active:shadow-[0_var(--spacing)_0_var(--note-default-100)]
      ${blackPressed ? 'top-1 bg-[var(--note-default-100)] shadow-[0_var(--spacing)_0_var(--note-default-100)]' : ''}`}
      onpointerdown={(e) => startBlackPress(name + '#', octave, e)}
      onpointerup={() => endBlackPress(name + '#', octave)}
    >
      {name + '#' + octave.toString()}
    </button>
  {/if}
</div>
