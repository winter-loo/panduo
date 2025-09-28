<script lang="ts">
  import type { ComponentType } from 'svelte';
  import RoadmapCapsule from './RoadmapCapsule.svelte';

  export type RoadmapItem = {
    icon: ComponentType;
    label: string;
    showLoop?: boolean;
    align?: 'start' | 'center' | 'end';
  };

  export let title = 'Roadmap';
  export let items: RoadmapItem[] = [];

  const ALIGN_CLASS: Record<'start' | 'center' | 'end', string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };
</script>

<section class="flex w-full flex-col gap-10">
  <header>
    <h3 class="text-3xl font-semibold uppercase tracking-[0.2em] text-[#58cc02]">{title}</h3>
  </header>
  <div class="flex flex-col gap-8">
    {#each items as item (item.label)}
      <div class={`flex w-full ${ALIGN_CLASS[item.align ?? 'start']}`}>
        <RoadmapCapsule icon={item.icon} label={item.label} showLoop={item.showLoop ?? false} />
      </div>
    {/each}
  </div>
</section>
