<script lang="ts">
  import type { ComponentType } from 'svelte';

  type RoadmapCapsuleProps = {
    icon: ComponentType;
    label: string;
    showLoop?: boolean;
  };

  const props = $props<RoadmapCapsuleProps>();
  const icon = $derived(props.icon);
  const label = $derived(props.label);
  const showLoop = $derived(props.showLoop ?? false);
</script>

<div class="relative flex h-[117px] w-[135px] items-center justify-center">
  {#if showLoop}
    <span
      class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#d9d9d9] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#4d4d4d]"
    >
      loop
    </span>
  {/if}
  <div
    class="flex h-full w-full items-center justify-center rounded-full bg-white shadow-[inset_0_-4px_0_rgba(224,224,224,0.6)]"
  >
    <div
      class="flex h-[72px] w-[110px] flex-col items-center justify-center gap-2 rounded-full bg-[#58cc02] text-white shadow-[0_8px_0_rgba(44,169,0,1)]"
    >
      <svelte:component this={icon} class="h-7 w-7" />
      <span class="text-sm font-semibold">{label}</span>
    </div>
  </div>
</div>
