<script lang="ts">
  import PianoKey, {
    type PianoKeyFullName,
    type PianoKeyName,
    type PianoKeyProps,
    type PianoPluginNameOptions,
    type PianoPluginOptions,
  } from '$lib/components/piano-key/piano-key.svelte';

  type ChallengeNote = Omit<
    PianoKeyProps,
    'plugin' | 'pluginOptions' | 'onnoteon' | 'onnoteoff'
  > & {
    id: string;
    badgeClass: string;
  };

  type ChallengeGroup = {
    id: string;
    widthClass: string;
    notes: ChallengeNote[];
  };

  const badgeBase = 'flex h-12 w-12 items-center justify-center text-6 font-semibold';

  const groups: ChallengeGroup[] = [
    {
      id: 'segment-lower',
      widthClass: 'md:w-[240px]',
      notes: [
        {
          id: 'c4',
          name: 'C',
          octave: 4,
          badgeClass: `${badgeBase} text-[var(--note-c-500)]`,
        },
        {
          id: 'd4',
          name: 'D',
          octave: 4,
          badgeClass: `${badgeBase} text-[var(--note-d-500)]`,
        },
        {
          id: 'e4',
          name: 'E',
          octave: 4,
          badgeClass: `${badgeBase} text-[var(--note-e-500)]`,
        },
      ],
    },
    {
      id: 'segment-middle',
      widthClass: 'md:w-[320px]',
      notes: [
        {
          id: 'f4',
          name: 'F',
          octave: 4,
          badgeClass: `${badgeBase} text-[var(--note-f-500)]`,
        },
        {
          id: 'g4',
          name: 'G',
          octave: 4,
          badgeClass: `${badgeBase} text-[var(--note-g-500)]`,
        },
        {
          id: 'a4',
          name: 'A',
          octave: 4,
          badgeClass: `${badgeBase} text-[var(--note-a-500)]`,
        },
        {
          id: 'b4',
          name: 'B',
          octave: 4,
          badgeClass: `${badgeBase} text-[var(--note-b-500)]`,
        },
      ],
    },
    {
      id: 'segment-upper',
      widthClass: 'md:w-[240px]',
      notes: [
        {
          id: 'c5',
          name: 'C',
          octave: 5,
          badgeClass: `${badgeBase} text-[var(--note-c-500)]`,
        },
        {
          id: 'd5',
          name: 'D',
          octave: 5,
          badgeClass: `${badgeBase} text-[var(--note-d-500)]`,
        },
        {
          id: 'e5',
          name: 'E',
          octave: 5,
          badgeClass: `${badgeBase} text-[var(--note-e-500)]`,
        },
      ],
    },
  ];
</script>

{#snippet plugin({ name, options }: PianoPluginNameOptions)}
  {@const pgOptions = options as { badgeClass: string }}
  <div class={`${pgOptions.badgeClass}`}>
    {#if name.sharp}
      {name.name + '#'}
    {:else}
      {name.name}
    {/if}
  </div>
{/snippet}

<main class="flex min-h-screen items-center justify-center bg-[var(--app-lightest)] px-3 py-10">
  <div
    class="flex max-h-[399px] w-full max-w-[844px] flex-col rounded-sm bg-white px-4 py-2 shadow-sm"
  >
    <header class="relative flex h-12 items-center justify-center">
      <div class="absolute left-0 flex-shrink-0">
        <img src="/challenge/icon-close.svg" alt="close icon" class="h-8 w-8" loading="lazy" />
      </div>
      <h1 class="text-8 text-center leading-12 font-semibold text-[var(--note-black)]">
        轮到你了！
      </h1>
    </header>

    <div class="flex h-40 items-center justify-center pt-4 pb-6">
      <img
        src="/challenge/challenge-illustration.svg"
        alt="挑战插画"
        class="h-full max-w-full"
        loading="lazy"
      />
    </div>

    <div class="flex flex-col items-center md:flex-row md:items-end md:justify-between">
      {#each groups as group (group.id)}
        <div class={`flex w-full flex-col items-center md:w-auto ${group.widthClass}`}>
          <div class="flex items-end justify-center">
            {#each group.notes as { id, name, octave, badgeClass }, index (`${group.id}-${id}`)}
              <PianoKey
                {name}
                {octave}
                hideBlack={index + 1 === group.notes.length}
                {plugin}
                pluginOptions={{ badgeClass }}
              ></PianoKey>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</main>
