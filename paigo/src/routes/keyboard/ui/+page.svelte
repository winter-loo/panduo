<script lang="ts">
  import PianoKey from '$lib/components/piano-key/piano-key.svelte';
  import type { PianoKeyFullname, PianoKeyName } from '$lib/components/piano-key/piano-key.svelte';
  const TemplateKeys: PianoKeyName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const numPianoKeys = 52;
  const initialOctave = 0;

  let pianoKeys: PianoKeyFullname[] = [];
  let octave = initialOctave;

  for (let i = 0; i < numPianoKeys; i++) {
    let name = TemplateKeys[i % TemplateKeys.length];
    if (name == 'C') {
      octave += 1;
    }
    pianoKeys.push({ name, octave });
  }
</script>

<div class="w-screen overflow-hidden">
  <div class="w-full h-[90vh] p-3 flex items-end justify-around -translate-x-[70%]">
    {#each pianoKeys as { name, octave }, index}
      <PianoKey {name} {octave} hideBlack={index + 1 == numPianoKeys}></PianoKey>
    {/each}
  </div>
</div>
