<script lang="ts">
  import { ArrowLeft, Notebook } from '@lucide/svelte';

  type StageNavbarProps = {
    stageLabel?: string;
    songTitle?: string;
    onback: () => void;
  };

  const props: StageNavbarProps = $props();
  const stageLabel = $derived(props.stageLabel ?? '');
  const songTitle = $derived(props.songTitle ?? '');
</script>

<header
  class="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--app-color-500)] p-4
  text-[var(--app-color-100)] shadow-[0_20px_40px_rgba(88,204,2,0.25)]"
>
  <div class="flex flex-1 items-center gap-4">
    <div class="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        class="flex h-9 gap-2 items-center justify-start rounded-full text-[var(--app-color-100)] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Go back"
        onclick={() => props.onback()}
      >
        <ArrowLeft class="h-6 w-6" />
        <span class="text-base font-medium tracking-wide uppercase">{stageLabel}</span>
      </button>
      <h2 class="truncate text-2xl font-semibold">{songTitle}</h2>
    </div>
  </div>
  <div class="flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--app-color-100)]">
    <Notebook class="h-7 w-7" />
  </div>
</header>
