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

  const badgeBase =
    'flex h-12 w-12 items-center justify-center rounded-full text-[22px] font-semibold text-white';

  const groups: ChallengeGroup[] = [
    {
      id: 'segment-lower',
      widthClass: 'md:w-[240px]',
      notes: [
        {
          id: 'c4',
          name: 'C',
          octave: 4,
          badgeClass: `${badgeBase} bg-[#EC7D7F]`,
        },
        {
          id: 'd4',
          name: 'D',
          octave: 4,
          badgeClass: `${badgeBase} text-[#DB8C39]`,
        },
        {
          id: 'e4',
          name: 'E',
          octave: 4,
          badgeClass: `${badgeBase} text-[#6EAE57]`,
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
          badgeClass: `${badgeBase} text-[#02B38A]`,
        },
        {
          id: 'g4',
          name: 'G',
          octave: 4,
          badgeClass: `${badgeBase} text-[#7F9BF5]`,
        },
        {
          id: 'a4',
          name: 'A',
          octave: 4,
          badgeClass: `${badgeBase} text-[#BE89E1]`,
        },
        {
          id: 'b4',
          name: 'B',
          octave: 4,
          badgeClass: `${badgeBase} text-[#DE7FB8]`,
        },
      ],
    },
    {
      id: 'segment-upper',
      widthClass: 'md:w-[240px]',
      notes: [
        {
          id: 'c5',
          name: 'C' as PianoKeyName,
          octave: 5,
          badgeClass: `${badgeBase} text-[#EC7D7F]`,
        },
        {
          id: 'd5',
          name: 'D' as PianoKeyName,
          octave: 5,
          badgeClass: `${badgeBase} text-[#DB8C39]`,
        },
        {
          id: 'e5',
          name: 'E' as PianoKeyName,
          octave: 5,
          badgeClass: `${badgeBase} text-[#6EAE57]`,
        },
      ],
    },
  ];
</script>

{#snippet plugin({ name, options }: PianoPluginNameOptions)}
  {@const pgOptions = options as { badgeClass: string }}
  <div class={`mt-6 ${pgOptions.badgeClass}`}>
    {#if name.sharp}
      {name.name + '#'}
    {:else}
      {name.name}
    {/if}
  </div>
{/snippet}

<main class="flex min-h-screen items-center justify-center bg-[#f5f6fa] px-3 py-10">
  <div class="w-full max-w-[844px] rounded-[24px] bg-white px-8 pt-6 pb-10 shadow-sm">
    <header class="flex items-center py-2">
      <div class="flex-shrink-0">
        <img src="/challenge/challenge-icon.svg" alt="挑战图标" class="h-9 w-9" loading="lazy" />
      </div>
      <div class="flex-1">
        <h1
          class="px-[90px] py-[2px] text-center text-[24px] leading-[29px] font-semibold text-[#101828]"
        >
          轮到你了！
        </h1>
      </div>
    </header>

    <div class="mt-6 flex justify-center">
      <img
        src="/challenge/challenge-illustration.svg"
        alt="挑战插画"
        class="w-[348px] max-w-full"
        loading="lazy"
      />
    </div>

    <div class="mt-9 flex flex-col items-center gap-7 md:flex-row md:items-end md:justify-between">
      {#each groups as group (group.id)}
        <div class={`flex w-full flex-col items-center md:w-auto ${group.widthClass}`}>
          <div class="flex items-end justify-center gap-2">
            {#each group.notes as note, index (`${group.id}-${note.id}`)}
              <PianoKey
                name={note.name}
                octave={note.octave}
                hideBlack={index + 1 === group.notes.length}
                {plugin}
                pluginOptions={{ badgeClass: note.badgeClass }}
              ></PianoKey>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</main>
