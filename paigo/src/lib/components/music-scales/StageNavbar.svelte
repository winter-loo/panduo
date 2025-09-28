<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ArrowLeft, Notebook } from '@lucide/svelte';

  export let stageLabel = '';
  export let songTitle = '';

  const dispatch = createEventDispatcher<{ back: void }>();

  function handleBack() {
    dispatch('back');
  }
</script>

<header class="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#58cc02] p-4 text-[#f3f3f3] shadow-[0_20px_40px_rgba(88,204,2,0.25)]">
  <div class="flex flex-1 items-center gap-4">
    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#58cc02] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      aria-label="Go back"
      on:click={handleBack}
    >
      <ArrowLeft class="h-5 w-5" />
    </button>
    <div class="flex min-w-0 flex-col">
      <span class="text-sm font-medium uppercase tracking-wide text-[#e8ffe1]">{stageLabel}</span>
      <h2 class="truncate text-2xl font-semibold">{songTitle}</h2>
    </div>
  </div>
  <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#58cc02]">
    <Notebook class="h-7 w-7" />
  </div>
</header>
