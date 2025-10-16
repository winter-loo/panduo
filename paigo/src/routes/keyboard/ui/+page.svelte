<script lang="ts">
  import PianoKey from '$lib/components/piano-key/piano-key.svelte';
  import type {
    PianoKeyProps,
    PianoKeyName,
    PianoKeyFullName,
  } from '$lib/components/piano-key/piano-key.svelte';
  import { MovableElement } from '$lib/movable';
  import { Select } from 'bits-ui';
  const TemplateKeys: PianoKeyName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const numPianoKeys = 52;

  let middleKey = $state<HTMLElement | null>(null);
  let windowWidth = $state(960);
  let offsetX = $state(-144);
  let keyboardWidth = $state(960);

  let selectedOctave = $state('4');
  let selectedName = $state('C');
  let middleKeyName = $derived(selectedName + selectedOctave);
  const movable = new MovableElement(0);

  let pianoKeys: PianoKeyProps[] = [];
  let octave = 0;

  for (let i = 0; i < numPianoKeys; i++) {
    let name = TemplateKeys[i % TemplateKeys.length];
    if (name == 'C') {
      octave += 1;
    }
    pianoKeys.push({ name, octave });
  }

  $effect(() => {
    const maxOffset = Math.max(0, keyboardWidth - windowWidth);
    movable.maxOffsetX = maxOffset;
    if (movable.currentOffsetX > maxOffset) {
      movable.moveTo(maxOffset, 0, false);
    }
  });

  $effect(() => {
    if (middleKey) {
      const middleKeyOffsetLeft = middleKey.offsetLeft;
      const middleKeyWidth = middleKey.offsetWidth;
      // compute how far we need to shift the rail so the chosen key sits at the viewport center:
      // (windowWidth / 2) gives the viewport midpoint, subtracting the key's midpoint gives
      // a signed offset; negative means slide the keyboard left. We then clamp that offset
      // into [-movable.maxOffsetX, 0] so we never go past either rail limit.
      const computedOffset = windowWidth / 2 - middleKeyOffsetLeft - middleKeyWidth / 2;
      const minOffset = -movable.maxOffsetX;
      const clampedOffset = Math.max(minOffset, Math.min(0, computedOffset));
      offsetX = clampedOffset;
      movable.moveTo(-clampedOffset);
    }
  });

  function onnoteon({ name, octave }: PianoKeyFullName) {
    console.log(`key ${name}${octave} pressed`);
  }
  function onnoteoff({ name, octave }: PianoKeyFullName) {
    console.log(`key ${name}${octave} released`);
  }

  const pianoKeyHighlights: Record<string, { bg: string; border: string; text: string }> = {
    C: {
      text: 'text-[var(--note-c-100)]',
      bg: 'bg-[var(--note-c-700)]',
      border: 'border-[var(--note-c-900)]/30',
    },
    D: {
      text: 'text-[var(--note-d-500)]',
      bg: 'bg-[var(--note-d)]',
      border: 'border-[var(--note-d-300)]',
    },
    E: {
      text: 'text-[var(--note-e-500)]',
      bg: 'bg-[var(--note-e)]',
      border: 'border-[var(--note-e-300)]',
    },
    F: {
      text: 'text-[var(--note-f)]',
      bg: 'bg-[var(--note-f-500)]',
      border: 'border-[var(--note-f-300)]',
    },
    G: {
      text: 'text-[var(--note-g)]',
      bg: 'bg-[var(--note-g-500)]',
      border: 'border-[var(--note-g-300)]',
    },
    A: {
      text: 'text-[var(--note-a)]',
      bg: 'bg-[var(--note-a-500)]',
      border: 'border-[var(--note-a-300)]',
    },
    B: {
      text: 'text-[var(--note-b)]',
      bg: 'bg-[var(--note-b-500)]',
      border: 'border-[var(--note-b-300)]',
    },
  };
</script>

<div class="middle-line fixed top-0 left-[50%] z-10 hidden h-screen w-0.5 bg-red-500"></div>

<div class="p-2">
  <span class="text-[var(--note-default-900)]">Middle Key</span>
  <Select.Root type="single" bind:value={selectedName}>
    <Select.Trigger>
      <span class="w-4 truncate px-2 py-2 text-start outline">
        {selectedName}
      </span>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content>
        <Select.Viewport>
          {#each ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as name}
            <Select.Item
              class="rounded-button flex h-10 w-full items-center justify-center bg-[var(--key-hover)] px-2 text-sm capitalize
               outline-hidden select-none data-highlighted:bg-[var(--key-active)]"
              value={name}
              label={name}
            >
              {name}
            </Select.Item>
          {/each}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
  <Select.Root type="single" bind:value={selectedOctave}>
    <Select.Trigger>
      <span class="w-4 truncate px-2 py-2 text-start outline">
        {selectedOctave}
      </span>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content>
        <Select.Viewport>
          {#each Array.from({ length: 8 }) as _, index}
            <Select.Item
              class="rounded-button flex h-10 w-full items-center justify-center bg-[var(--key-hover)] px-2 text-sm capitalize
              outline-hidden select-none data-highlighted:bg-[var(--key-active)]"
              value={(index + 1).toString()}
              label={(index + 1).toString()}
            >
              {index + 1}
            </Select.Item>
          {/each}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
</div>

<div class="m-10 flex hidden w-400 items-center justify-center">
  <div class="inline-flex">
    <PianoKey name="E" octave={4} {pluginOnWhite} {pluginOnBlack}></PianoKey>
    <PianoKey name="F" octave={4} {pluginOnWhite} {pluginOnBlack}></PianoKey>
    <PianoKey name="E" octave={4} {pluginOnWhite} {pluginOnBlack}></PianoKey>
  </div>
</div>

{#snippet pianoKeyPlugin({ name, octave }: PianoKeyFullName)}
  <div>
    <!-- Outer circle -->
    <div
      class={`flex h-12 w-12 items-center justify-center rounded-full border-12 ${pianoKeyHighlights[name[0]].bg} ${pianoKeyHighlights[name[0]].border}`}
    ></div>
    <!-- Inner circle -->
    <div
      class={`flex h-12 w-12 items-center justify-center rounded-full border-12 ${pianoKeyHighlights[name[0]].bg} ${pianoKeyHighlights[name[0]].border}`}
    ></div>
    <span
      class={`flex items-center justify-center text-sm font-extrabold ${pianoKeyHighlights[name[0]].text}`}
      >{name}</span
    >
  </div>
{/snippet}

{#snippet pluginOnWhite({ name, octave }: PianoKeyFullName)}
  {@render pianoKeyPlugin({ name, octave })}
{/snippet}

{#snippet pluginOnBlack({ name, octave }: PianoKeyFullName)}
  {@render pianoKeyPlugin({ name, octave })}
{/snippet}

{#snippet pianokey(name: PianoKeyName, octave: number, last: boolean)}
  <PianoKey {name} {octave} hideBlack={last} {onnoteon} {onnoteoff} {pluginOnWhite} {pluginOnBlack}
  ></PianoKey>
{/snippet}

<div id="piano-keyboard" class="fixed bottom-0 w-screen overflow-hidden">
  <div
    class="relative inline-flex items-end justify-around transition-transform duration-100 ease-out"
    {@attach movable.draggable('.handle')}
  >
    <div
      class="handle absolute top-0 left-0 h-2 w-full cursor-move bg-white"
      bind:clientWidth={keyboardWidth}
    ></div>
    {#each pianoKeys as { name, octave }, index}
      {#if `${name}${octave}` == middleKeyName}
        <!-- Pull the wrapper left so the middle key keeps the same gap as its neighbours -->
        <div bind:this={middleKey} class="-mr-[var(--spacing)]" data-middle-key>
          {@render pianokey(name, octave, index + 1 == numPianoKeys)}
        </div>
      {:else}
        {@render pianokey(name, octave, index + 1 == numPianoKeys)}
      {/if}
    {/each}
  </div>
</div>

<svelte:window bind:innerWidth={windowWidth} />
