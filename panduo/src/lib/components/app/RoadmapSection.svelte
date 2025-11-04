<script lang="ts">
  import type { Component } from 'svelte';
  import RoadmapCapsule from './RoadmapCapsule.svelte';

  export type RoadmapItem = {
    icon: Component;
    label: string;
    showLoop?: boolean;
    align?: 'start' | 'center' | 'end';
  };

  type RoadmapSectionProps = {
    title?: string;
    items?: RoadmapItem[];
  };

  const props: RoadmapSectionProps = $props();
  const title = $derived(props.title ?? 'Roadmap');
  const items = $derived(props.items ?? []);

  const ALIGN_CLASS: Record<'start' | 'center' | 'end', string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };
</script>

<section class="flex w-full flex-col gap-10">
  <header>
    <h3 class="text-3xl font-semibold tracking-[0.2em] text-[#58cc02] uppercase">{title}</h3>
  </header>
  <div class="flex flex-col gap-8">
    {#each items as item (item.label)}
      <div class={`flex w-full ${ALIGN_CLASS[item.align ?? 'start']}`}>
        <RoadmapCapsule label={item.label} showLoop={item.showLoop ?? false}>
          <item.icon class="h-6 w-6 text-white" />
        </RoadmapCapsule>
      </div>
    {/each}
  </div>
</section>
