<script lang="ts">
  export type PianoKeyName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  export type PianoKeyFullname = {
    name: PianoKeyName;
    octave: number;
    hideBlack?: boolean;
  };
  let { name, octave, hideBlack = false }: PianoKeyFullname = $props();
</script>

<!--
  use 'py-2 pl-1' to have exactly width taken visually by this piano key, i.e.,
  to include shadow spacing
-->
<div class="piano-key relative py-2 pl-1" data-name={name} data-octave={octave}>
  <button
    class="white-key ease z-1
    flex h-48 w-18 items-end justify-center bg-white text-[var(--note-default)]
    shadow-[0_0_0_var(--spacing)_var(--border),0_var(--spacing)_0_var(--spacing)_var(--border)]
    transition-all
    duration-200
    hover:bg-[var(--key-hover)]
    active:translate-y-1
    active:bg-[var(--key-active)]"
  >
    {name + octave.toString()}
  </button>
  {#if name != 'E' && name != 'B' && !hideBlack}
    <button
      class="black-key ease absolute top-0 left-11 z-2 flex h-24
      w-13 items-end justify-center bg-[var(--note-default-500)]
      text-white
      shadow-[0_calc(var(--spacing)*2)_0_var(--note-default-100)] transition-all
      duration-200 hover:bg-[var(--note-default-300)] active:top-1
      active:bg-[var(--note-default-100)] active:shadow-[0_var(--spacing)_0_var(--note-default-100)]"
    >
      {name + '#' + octave.toString()}
    </button>
  {/if}
</div>
