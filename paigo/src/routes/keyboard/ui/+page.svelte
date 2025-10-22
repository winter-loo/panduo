<script lang="ts">
  import { Select } from 'bits-ui';
  import PianoKeyboard from '$lib/components/piano-keyboard/piano-keyboard.svelte';
  import type { PianoKeyName } from '$lib/components/piano-key/piano-key.svelte';

  type AlignMode = 'left' | 'middle' | 'right';

  const NOTE_OPTIONS: PianoKeyName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const OCTAVE_OPTIONS = [1, 3, 4, 5, 6, 7] as const;
  const groupGapValues = [0, 2, 4, 6, 8, 10] as const;
  const groupGapClassByValue = {
    0: 'w-0',
    2: 'w-2',
    4: 'w-4',
    6: 'w-6',
    8: 'w-8',
    10: 'w-10',
  } as const satisfies Record<(typeof groupGapValues)[number], string>;
  const alignOptions = [
    { value: 'left', label: 'Align keyboard to the left' },
    { value: 'middle', label: 'Align keyboard to the middle' },
    { value: 'right', label: 'Align keyboard to the right' },
  ] as const satisfies { value: AlignMode; label: string }[];

  let selectedOctave = $state('4');
  let selectedName = $state<PianoKeyName>('C');
  let align = $state<AlignMode>('middle');
  let groupGap = $state<(typeof groupGapValues)[number]>(4);
  let keyboardRef = $state<PianoKeyboard | null>(null);

  function incrementGroupGap() {
    const index = groupGapValues.indexOf(groupGap);
    if (index < groupGapValues.length - 1) {
      groupGap = groupGapValues[index + 1];
    }
  }

  function decrementGroupGap() {
    const index = groupGapValues.indexOf(groupGap);
    if (index > 0) {
      groupGap = groupGapValues[index - 1];
    }
  }

  $effect(() => {
    keyboardRef?.pkHighlight({ name: 'C', octave: 4, sharp: false }, true);
    keyboardRef?.pkHighlight({ name: 'C', octave: 4, sharp: true }, true);
    keyboardRef?.pkHighlight({ name: 'D', octave: 4, sharp: false }, true);
    keyboardRef?.pkHighlight({ name: 'D', octave: 4, sharp: true }, true);
    keyboardRef?.pkHighlight({ name: 'E', octave: 4, sharp: false }, true);
    keyboardRef?.pkHighlight({ name: 'F', octave: 4, sharp: false }, true);
    keyboardRef?.pkHighlight({ name: 'F', octave: 4, sharp: true }, true);
    keyboardRef?.pkHighlight({ name: 'G', octave: 4, sharp: false }, true);
    keyboardRef?.pkHighlight({ name: 'G', octave: 4, sharp: true }, true);
    keyboardRef?.pkHighlight({ name: 'A', octave: 4, sharp: false }, true);
    keyboardRef?.pkHighlight({ name: 'A', octave: 4, sharp: true }, true);
    keyboardRef?.pkHighlight({ name: 'B', octave: 4, sharp: false }, true);
  });
</script>

{#snippet options(
  options: readonly (string | number)[],
  value: string,
  onChange: (value: string) => void,
  ariaLabel: string,
)}
  <Select.Root type="single" {value} onValueChange={onChange}>
    <Select.Trigger
      class="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D6E9D1] bg-white text-[36px] font-semibold text-[#5FC134] uppercase transition-colors outline-none hover:bg-[#F5FBF1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5FC134]"
      aria-label={ariaLabel}
    >
      {value}
    </Select.Trigger>
    <Select.Portal>
      <Select.Content
        class="z-10 overflow-hidden rounded-2xl border border-[#D6E9D1] bg-white shadow-[0_12px_40px_-24px_rgba(7,29,0,0.45)]"
      >
        <Select.Viewport class="grid gap-1 p-2">
          {#each options as option}
            {@const optionLabel = String(option)}
            <Select.Item
              class="text-6 flex h-9 w-9 items-center justify-center font-semibold text-[#5FC134] outline-none data-[highlighted]:bg-[#F5FBF1]"
              value={optionLabel}
              label={optionLabel}
            >
              {optionLabel}
            </Select.Item>
          {/each}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
{/snippet}

{#snippet alignIcon(mode: AlignMode)}
  {#if mode === 'left'}
    <svg width="48" height="48" viewBox="0 0 42 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 0H3C1.34315 0 0 1.34315 0 3V33C0 34.6569 1.34315 36 3 36H9C10.6569 36 12 34.6569 12 33V3C12 1.34315 10.6569 0 9 0Z"
        fill="#CBD4C8"
      />
      <path
        fill="currentColor"
        d="M8.625 2.625H3.375C2.54657 2.625 1.875 3.29657 1.875 4.125V31.875C1.875 32.7034 2.54657 33.375 3.375 33.375H8.625C9.45343 33.375 10.125 32.7034 10.125 31.875V4.125C10.125 3.29657 9.45343 2.625 8.625 2.625Z"
      />
      <path
        d="M24 0H18C16.3431 0 15 1.34315 15 3V33C15 34.6569 16.3431 36 18 36H24C25.6569 36 27 34.6569 27 33V3C27 1.34315 25.6569 0 24 0Z"
        fill="#CBD4C8"
      />
      <path
        d="M39 0H33C31.3431 0 30 1.34315 30 3V33C30 34.6569 31.3431 36 33 36H39C40.6569 36 42 34.6569 42 33V3C42 1.34315 40.6569 0 39 0Z"
        fill="#CBD4C8"
      />
    </svg>
  {:else if mode === 'middle'}
    <svg width="48" height="48" viewBox="0 0 42 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 0H3C1.34315 0 0 1.34315 0 3V33C0 34.6569 1.34315 36 3 36H9C10.6569 36 12 34.6569 12 33V3C12 1.34315 10.6569 0 9 0Z"
        fill="#CBD4C8"
      />
      <path
        d="M24 0H18C16.3431 0 15 1.34315 15 3V33C15 34.6569 16.3431 36 18 36H24C25.6569 36 27 34.6569 27 33V3C27 1.34315 25.6569 0 24 0Z"
        fill="#CBD4C8"
      />
      <path
        fill="currentColor"
        d="M23.625 2.625H18.375C17.5466 2.625 16.875 3.29657 16.875 4.125V31.875C16.875 32.7034 17.5466 33.375 18.375 33.375H23.625C24.4534 33.375 25.125 32.7034 25.125 31.875V4.125C25.125 3.29657 24.4534 2.625 23.625 2.625Z"
      />
      <path
        d="M39 0H33C31.3431 0 30 1.34315 30 3V33C30 34.6569 31.3431 36 33 36H39C40.6569 36 42 34.6569 42 33V3C42 1.34315 40.6569 0 39 0Z"
        fill="#CBD4C8"
      />
    </svg>
  {:else}
    <svg width="48" height="48" viewBox="0 0 42 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 0H3C1.34315 0 0 1.34315 0 3V33C0 34.6569 1.34315 36 3 36H9C10.6569 36 12 34.6569 12 33V3C12 1.34315 10.6569 0 9 0Z"
        fill="#CBD4C8"
      />
      <path
        d="M24 0H18C16.3431 0 15 1.34315 15 3V33C15 34.6569 16.3431 36 18 36H24C25.6569 36 27 34.6569 27 33V3C27 1.34315 25.6569 0 24 0Z"
        fill="#CBD4C8"
      />
      <path
        d="M30 3C30 1.34314 31.3432 0 33 0H39C40.6568 0 42 1.34314 42 3V33C42 34.6568 40.6568 36 39 36H33C31.3432 36 30 34.6568 30 33V3Z"
        fill="#CBD4C8"
      />
      <path
        fill="currentColor"
        d="M38.625 2.625H33.375C32.5466 2.625 31.875 3.29657 31.875 4.125V31.875C31.875 32.7034 32.5466 33.375 33.375 33.375H38.625C39.4534 33.375 40.125 32.7034 40.125 31.875V4.125C40.125 3.29657 39.4534 2.625 38.625 2.625Z"
      />
    </svg>
  {/if}
{/snippet}

<div
  class="mx-auto mt-12 w-full max-w-[650px] rounded-[32px] border border-[#CBD4C8] bg-white p-[10px] shadow-[0_24px_80px_-40px_rgba(7,29,0,0.35)]"
>
  <div class="flex flex-col gap-[10px]">
    <header class="p-4">
      <h2 class="text-3xl leading-[1.21] font-semibold text-[#071D00]">Keyboard settings</h2>
      <p class="mt-2 text-xl leading-[1.33] text-[#596D53]">
        Tune the virtual keyboard to match your instrument
      </p>
    </header>

    <section class="flex flex-wrap items-center justify-between gap-[10px] px-4 py-4">
      <span class="text-2xl font-semibold text-[#071D00] uppercase">Middle key</span>
      <div class="flex items-center gap-[10px]">
        {@render options(
          NOTE_OPTIONS,
          selectedName,
          (next) => (selectedName = next as PianoKeyName),
          'Select middle key name',
        )}
        {@render options(
          OCTAVE_OPTIONS,
          selectedOctave,
          (next) => (selectedOctave = next),
          'Select middle key octave',
        )}
      </div>
    </section>

    <section class="flex flex-wrap items-center justify-between gap-[10px] px-4 py-4">
      <div class="max-w-[280px]">
        <span class="block text-2xl font-semibold text-[#071D00] uppercase">Align</span>
        <p class="mt-1 text-base text-[#596D53]">Align the middle piano key</p>
      </div>
      <div class="flex items-center gap-[10px]">
        {#each alignOptions as option}
          <button
            type="button"
            class={`grid h-16 w-16 place-items-center rounded-2xl border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5FC134] ${
              align === option.value
                ? 'border-[#5FC134] text-[#5FC134]'
                : 'border-[#CBD4C8] text-white hover:bg-[#F5FBF1]'
            }`}
            aria-pressed={align === option.value}
            aria-label={option.label}
            onclick={() => (align = option.value)}
          >
            {@render alignIcon(option.value)}
          </button>
        {/each}
      </div>
    </section>

    <section class="flex flex-wrap items-center justify-between gap-[10px] px-4 py-4">
      <div class="max-w-[280px]">
        <span class="block text-2xl font-semibold text-[#071D00] uppercase">Group gap</span>
        <p class="mt-1 text-[16px] leading-[2] text-[#596D53]">Gap between piano key groups</p>
      </div>
      <div class="flex items-center gap-[10px]">
        <div class="flex overflow-hidden rounded-2xl border border-[#CBD4C8] bg-white">
          <button
            type="button"
            class="grid h-16 w-12 place-items-center text-2xl font-semibold text-[#5FC134] transition-colors hover:bg-[#F5FBF1] disabled:cursor-not-allowed disabled:opacity-40"
            onclick={decrementGroupGap}
            disabled={groupGap === groupGapValues[0]}
            aria-label="Decrease group gap"
          >
            -
          </button>
          <div class="grid h-16 w-16 place-items-center border-x border-[#CBD4C8] bg-white">
            <span class="text-[36px] font-semibold text-[#5FC134]">{groupGap}</span>
          </div>
          <button
            type="button"
            class="grid h-16 w-12 place-items-center text-2xl font-semibold text-[#5FC134] transition-colors hover:bg-[#F5FBF1] disabled:cursor-not-allowed disabled:opacity-40"
            onclick={incrementGroupGap}
            disabled={groupGap === groupGapValues[groupGapValues.length - 1]}
            aria-label="Increase group gap"
          >
            +
          </button>
        </div>
      </div>
    </section>
  </div>
</div>

<PianoKeyboard
  bind:this={keyboardRef}
  middleKeyName={{ name: selectedName, octave: Number(selectedOctave) }}
  {align}
  groupGap={groupGapClassByValue[groupGap]}
/>
