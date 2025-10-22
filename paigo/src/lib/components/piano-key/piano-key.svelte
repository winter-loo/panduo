<script lang="ts">
  export type PianoKeyName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  export type PianoKeyFullName = { name: PianoKeyName; octave: number; sharp: boolean };
  export type PianoPluginOptions = Record<string, unknown>;
  export type PianoPluginNameOptions = { name: PianoKeyFullName; options?: PianoPluginOptions };
  export type PianoKeyProps = {
    name: PianoKeyName;
    octave: number;
    hideBlack?: boolean;
    onnoteon?: (name: PianoKeyFullName) => void;
    onnoteoff?: (name: PianoKeyFullName) => void;
    plugin?: import('svelte').Snippet<[PianoPluginNameOptions]>;
    pluginOptions?: PianoPluginOptions;
  };
  let {
    name,
    octave,
    hideBlack = false,
    onnoteon,
    onnoteoff,
    plugin,
    pluginOptions,
  }: PianoKeyProps = $props();

  type PressOptions = { sharp?: boolean };

  // we need trigger piano key programatically
  let whiteActive = $state(false);
  let blackActive = $state(false);

  export function press(options: PressOptions = {}) {
    const { sharp = false } = options;
    const payload: PianoKeyFullName = { name, octave, sharp };
    if (sharp) {
      startBlackPress(payload);
    } else {
      startWhitePress(payload);
    }
  }

  export function release(options: PressOptions = {}) {
    const { sharp = false } = options;
    const payload: PianoKeyFullName = { name, octave, sharp };
    if (sharp) {
      endBlackPress(payload);
    } else {
      endWhitePress(payload);
    }
  }

  function startWhitePress(name: PianoKeyFullName) {
    whiteActive = true;
    window.addEventListener('pointerup', () => endWhitePress(name));
    onnoteon?.(name);
  }

  function endWhitePress(name: PianoKeyFullName) {
    whiteActive = false;
    onnoteoff?.(name);
  }

  function startBlackPress(name: PianoKeyFullName) {
    blackActive = true;
    window.addEventListener('pointerup', () => endBlackPress(name));
    onnoteon?.(name);
  }

  function endBlackPress(name: PianoKeyFullName) {
    blackActive = false;
    onnoteoff?.(name);
  }
</script>

<!--
  * use 'my-2 ml-1 last:mr-1' to have exactly width taken visually by this piano key, i.e.,
    to include shadow spacing
  * the CSS custom property keeps the black key decoupled from the white key's active height change
  * implementation notes: use shadown and inset shadow and height transition to create a
    slide up/down effect on click.
    Pros:
      - easy to handle spacing bewteen piano keys
      - non clickable on the left and right shadows
    Cons:
      - inset shadow is clickable
      - need set `translate-y-0` on an inner child
-->
<div
  class="piano-key relative mt-2 mb-1 ml-1 inline-flex h-[var(--white-key-height)] items-end last:mr-1"
  data-name={name}
  data-octave={octave}
>
  <!-- lesson leart: on active, do not remove the second shadow even it has the same value as the first one. -->
  <!-- Instead, change only what should be changed -->
  <button
    class={`white-key group z-1 flex
    h-[var(--white-key-height)] w-18 items-end justify-center rounded-sm bg-white text-[var(--note-black)]
    shadow-[0_0_0_var(--spacing)_var(--border),inset_0_calc(var(--spacing)*-1)_0_0_var(--border)] transition-all duration-200
    ease-out
    hover:bg-[var(--note-black-50)]
    focus:outline-none
    data-[active=true]:h-[var(--white-key-height-active)]
    data-[active=true]:bg-[var(--note-black-50)]
    data-[active=true]:shadow-[0_0_0_var(--spacing)_var(--border),inset_0_0_0_var(--border)]
    `}
    data-active={whiteActive}
    onpointerdown={() => startWhitePress({ name, octave, sharp: false })}
    onpointerup={() => endWhitePress({ name, octave, sharp: false })}
    onpointercancel={() => endWhitePress({ name, octave, sharp: false })}
  >
    <div
      class="plugin transition-translate -translate-y-1 duration-200 ease-out group-active:translate-y-0"
    >
      {@render plugin?.({ name: { name, octave, sharp: false }, options: pluginOptions })}
    </div>
  </button>
  {#if name != 'E' && name != 'B' && !hideBlack}
    <button
      class={`black-key group absolute -top-2 left-11 z-2 flex h-[var(--black-key-height)] w-13 items-end justify-center
      rounded-sm bg-[var(--note-black)] text-white shadow-[inset_0_calc(var(--spacing)*-2)_0_var(--note-black-900)]
      transition-all
      duration-200
      ease-out
      hover:bg-[var(--note-black-600)] focus:outline-none
      data-[active=true]:-top-1
      data-[active=true]:bg-[var(--note-black-700)]
      data-[active=true]:shadow-[inset_0_calc(var(--spacing)*-1)_0_var(--note-black-900)]
      `}
      data-active={blackActive}
      onpointerdown={() => startBlackPress({ name, octave, sharp: true })}
      onpointerup={() => endBlackPress({ name, octave, sharp: true })}
      onpointercancel={() => endBlackPress({ name, octave, sharp: true })}
    >
      <div
        class="plugin transition-translate -translate-y-2 duration-200 ease-out group-active:translate-y-0"
      >
        {@render plugin?.({ name: { name, octave, sharp: true }, options: pluginOptions })}
      </div>
    </button>
  {/if}
</div>

<style>
  .piano-key {
    --white-key-height: 10rem;
    --white-key-height-active: 9.75rem;
    --black-key-height: 6rem;
  }

  @media (min-height: 500px) {
    .piano-key {
      --white-key-height: 14rem;
      --white-key-height-active: 13.75rem;
      --black-key-height: 8rem;
    }
  }
</style>
