<script lang="ts">
  export type PianoKeyName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  export type PianoKeyFullname = {
    name: PianoKeyName;
    octave: number;
    hideBlack?: boolean;
  };
  let { name, octave, hideBlack = false }: PianoKeyFullname = $props();
</script>

<div class="piano-key relative" data-name={name} data-octave={octave}>
  <div
    class="white-key z-1 ring-4 ring-[var(--border)] shadow-[0_4px_0_4px_var(--border)] w-18 h-48 bg-white
    text-[var(--note-default)] flex justify-center items-end"
  >
    {name + octave.toString()}
  </div>
  {#if name != 'E' && name != 'B' && !hideBlack}
    <div
      class="black-key z-2 shadow-[0_8px_0_black] absolute -top-2 left-11 w-13 h-24
      bg-[var(--note-default)] text-white flex justify-center items-end"
    >
      {name + '#' + octave.toString()}
    </div>
  {/if}
</div>
