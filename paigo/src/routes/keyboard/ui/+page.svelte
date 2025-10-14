<script lang="ts">
  import PianoKey from '$lib/components/piano-key/piano-key.svelte';
  import type { PianoKeyFullname, PianoKeyName } from '$lib/components/piano-key/piano-key.svelte';
  const TemplateKeys: PianoKeyName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const numPianoKeys = 52;

  let middleKey = $state<HTMLElement | null>(null);
  let windowWidth = $state(960);
  let offsetX = $state(-144);
  let middleKeyName = 'C4';

  let pianoKeys: PianoKeyFullname[] = [];
  let octave = 0;

  for (let i = 0; i < numPianoKeys; i++) {
    let name = TemplateKeys[i % TemplateKeys.length];
    if (name == 'C') {
      octave += 1;
    }
    pianoKeys.push({ name, octave });
  }

  $effect(() => {
    if (middleKey) {
      const middleKeyOffsetLeft = middleKey.offsetLeft;
      const middleKeyWidth = middleKey.offsetWidth;
      offsetX = Math.min(0, windowWidth / 2 - middleKeyOffsetLeft - middleKeyWidth / 2);
    }
  });

  function onnoteon(name: string, octave: number) {
    console.log(`key ${name}${octave} pressed`);
  }
  function onnoteoff(name: string, octave: number) {
    console.log(`key ${name}${octave} released`);
  }
</script>

<div class="middle-line fixed top-0 left-[50%] z-10 hidden h-screen w-0.5 bg-red-500"></div>

{#snippet pianokey(name: PianoKeyName, octave: number, last: boolean)}
  <PianoKey {name} {octave} hideBlack={last} {onnoteon} {onnoteoff}></PianoKey>
{/snippet}

<div class="fixed bottom-0 w-screen overflow-hidden">
  <div
    class="relative flex w-full items-end justify-around transition-transform duration-100 ease-out"
    style:transform="translateX({offsetX}px)"
  >
    {#each pianoKeys as { name, octave }, index}
      {#if `${name}${octave}` == middleKeyName}
        <div bind:this={middleKey} data-middle-key>
          {@render pianokey(name, octave, index + 1 == numPianoKeys)}
        </div>
      {:else}
        {@render pianokey(name, octave, index + 1 == numPianoKeys)}
      {/if}
    {/each}
  </div>
</div>

<svelte:window bind:innerWidth={windowWidth} />
