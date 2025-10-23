<script lang="ts">
  export type PianoKeyName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  export type PianoKeyFullName = { name: PianoKeyName; octave: number; sharp: boolean };
  export type PianoPluginOptions = Record<string, unknown>;
  export type PianoPluginNameOptions = { name: PianoKeyFullName; options?: PianoPluginOptions };
  export type PianoKeyProps = {
    name: PianoKeyName;
    octave: number;
    highlight?: boolean;
    hideBlack?: boolean;
    onnoteon?: (name: PianoKeyFullName) => void;
    onnoteoff?: (name: PianoKeyFullName) => void;
    plugin?: import('svelte').Snippet<[PianoPluginNameOptions]>;
    pluginOptions?: PianoPluginOptions;
  };
  let {
    name,
    octave,
    highlight = false,
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

  export function activateUI(value: boolean, sharp: boolean = false) {
    if (sharp) {
      blackActive = value;
    } else {
      whiteActive = value;
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

  // 'data-[active=true]:bg-[var(--note-a)] data-[active=true]:shadow-[inset_0_calc(var(--spacing)*-1)_0_var(--note-a)]'
  const keyHighlightStyle: Record<string, string[]> = {
    A: [
      'data-[active=true]:ring-[var(--note-a)]/40 data-[active=true]:after:bg-[var(--note-a)]/20',
      'data-[active=true]:bg-[var(--note-a)] data-[active=true]:shadow-[var(--note-a)]',
    ],
    B: [
      'data-[active=true]:ring-[var(--note-b)]/40 data-[active=true]:after:bg-[var(--note-b)]/20',
      'data-[active=true]:bg-[var(--note-b)] data-[active=true]:shadow-[var(--note-b)]',
    ],
    C: [
      'data-[active=true]:ring-[var(--note-c)]/40 data-[active=true]:after:bg-[var(--note-c)]/20',
      'data-[active=true]:bg-[var(--note-c)] data-[active=true]:shadow-[var(--note-c)]',
    ],
    D: [
      'data-[active=true]:ring-[var(--note-d)]/40 data-[active=true]:after:bg-[var(--note-d)]/20',
      'data-[active=true]:bg-[var(--note-d)] data-[active=true]:shadow-[var(--note-d)]',
    ],
    E: [
      'data-[active=true]:ring-[var(--note-e)]/40 data-[active=true]:after:bg-[var(--note-e)]/20',
      'data-[active=true]:bg-[var(--note-e)] data-[active=true]:shadow-[var(--note-e)]',
    ],
    F: [
      'data-[active=true]:ring-[var(--note-f)]/40 data-[active=true]:after:bg-[var(--note-f)]/20',
      'data-[active=true]:bg-[var(--note-f)] data-[active=true]:shadow-[var(--note-f)]',
    ],
    G: [
      'data-[active=true]:ring-[var(--note-g)]/40 data-[active=true]:after:bg-[var(--note-g)]/20',
      'data-[active=true]:bg-[var(--note-g)] data-[active=true]:shadow-[var(--note-g)]',
    ],
  };
</script>

<!--
  * use 'my-2 ml-1 last:mr-1' to have exactly width taken visually by this piano key, i.e.,
    to include shadow spacing
  * use ':after' pseudo element to add overlay while hovering or being active
  * use 'z-2' while being active to highlight shadow and 'z-10' to put black keys
    on upper top layer
-->
<div
  class="piano-key relative mt-2 mb-1 ml-1 inline-flex h-[var(--white-key-height)] items-end last:mr-1"
  data-name={name}
  data-octave={octave}
>
  <!-- shadow-[0_0_0_var(--spacing)_var(--border)]  -->
  <button
    class={`white-key group relative z-1 flex
    h-[calc(var(--white-key-height))] w-18 items-end justify-center rounded-sm bg-white text-[var(--note-black)]
    ring-4 ring-[var(--border)]
    transition-all duration-200
    ease-out
    after:pointer-events-none
    after:absolute
    after:inset-0
    after:-z-1
    after:rounded-sm
    after:border-b-4
    after:border-[var(--border)]
    after:bg-white
    after:select-none
    hover:after:bg-[var(--note-black-100)]/20
    focus:outline-none
    data-[active=true]:z-2
    data-[active=true]:h-[var(--white-key-height-active)]
    data-[active=true]:after:border-0
    ${
      highlight
        ? keyHighlightStyle[name][0]
        : 'data-[active=true]:after:bg-[var(--note-black-100)]/40'
    }
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
      class={`black-key group absolute -top-2 left-11 z-10 flex h-[var(--black-key-height)] w-13 items-end justify-center
      rounded-sm bg-[var(--note-black)] text-white shadow-[inset_0_calc(var(--spacing)*-2)_0_var(--note-black-900)]
      transition-all
      duration-200
      ease-out
      hover:bg-[var(--note-black-600)] focus:outline-none
      data-[active=true]:-top-1
      ${
        highlight
          ? keyHighlightStyle[name][1]
          : 'data-[active=true]:bg-[var(--note-black-900)] data-[active=true]:shadow-[var(--note-black-900)]'
      }
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
