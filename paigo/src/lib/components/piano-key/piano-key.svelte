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
  <div
    class="white-key z-1 flex
    h-48 w-18 items-end justify-center bg-white text-[var(--note-default)] shadow-[0_0_0_var(--spacing)_var(--border),0_var(--spacing)_0_var(--spacing)_var(--border)]"
  >
    {name + octave.toString()}
  </div>
  {#if name != 'E' && name != 'B' && !hideBlack}
    <div
      class="black-key absolute -top-2 left-11 z-2 flex h-24 w-13
      items-end justify-center bg-[var(--note-default)] text-white shadow-[0_calc(var(--spacing)*2)_0_black]"
    >
      {name + '#' + octave.toString()}
    </div>
  {/if}
</div>
