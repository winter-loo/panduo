<script lang="ts">
  import { Select } from 'bits-ui';
  import PianoKeyboard from '$lib/components/piano-keyboord/piano-keyboard.svelte';
  let selectedOctave = $state('4');
  let selectedName = $state('C');
  let showHighlight = $state(true);
</script>

{#snippet options(options: any[], value: string, onChange: (value: string) => void)}
  <Select.Root type="single" {value} onValueChange={onChange}>
    <Select.Trigger
      class="bg-[var(--app-lightest)] px-3 py-2 text-2xl text-[var(--app-darkest)] outline outline-[var(--app-light)]"
    >
      {value}
    </Select.Trigger>
    <Select.Portal>
      <Select.Content>
        <Select.Viewport class="mt-1 p-1">
          {#each options as option}
            {@const optionLabel = String(option)}
            <Select.Item
              class="rounded-button flex items-center justify-center bg-[var(--app-lightest)] px-3
                text-xl font-thin text-[var(--app-darkest)]
                outline-hidden select-none data-highlighted:bg-[var(--app-darkest)] data-highlighted:text-[var(--app-lightest)]"
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

<div
  class="piano-keyboard-config mx-4 mt-10 w-full max-w-xl rounded-xl bg-[var(--app-lightest)] p-6 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.35)]"
>
  <h2 class="text-xl font-semibold tracking-wide text-[var(--app-darkest)]">Keyboard settings</h2>
  <p class="mt-1 text-sm text-[var(--app-dark)]">
    Tune the virtual keyboard to match your instrument.
  </p>

  <div class="mt-6 space-y-6 text-[var(--app-darkest)]">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <label
        for="middle-key-control"
        class="text-sm font-semibold tracking-wide text-[var(--app-darkest)] uppercase"
        >Middle key</label
      >
      <div id="middle-key-control" class="flex gap-2">
        {@render options(
          ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          selectedName,
          (next) => (selectedName = next),
        )}
        {@render options([1, 3, 4, 5, 6, 7], selectedOctave, (next) => (selectedOctave = next))}
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-[10rem]">
        <p class="text-sm font-semibold tracking-wide uppercase">Highlight keys</p>
        <p class="text-xs text-[var(--app-dark)]">Show active notes on the keyboard.</p>
      </div>
      <label
        for="keys-highlight-control"
        class="inline-flex items-center gap-3 text-base font-medium text-[var(--app-darkest)]"
      >
        <span>Show</span>
        <input
          id="keys-highlight-control"
          type="checkbox"
          class="h-6 w-6 rounded border-2 border-[var(--app-dark)] bg-white text-[var(--app-primary)] accent-[var(--app-dark)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-dark)]"
          bind:checked={showHighlight}
        />
      </label>
    </div>
  </div>
</div>

<PianoKeyboard />
