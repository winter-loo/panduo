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
  const items = $derived(props.items ?? []);

  const offsets = ['translate-x-0', '-translate-x-1/4', '-translate-x-1/4', 'translate-x-0'];
</script>

<section class="relative flex flex-col">
  {#each items as item, index (item.label)}
    <div class={`flex h-[118px] flex-row items-center justify-center ${offsets[index]}`}>
      <RoadmapCapsule label={item.label} showLoop={item.showLoop ?? false}>
        <item.icon size={56} strokeWidth=0 fill="var(--app-color-100)" class="text-white" />
      </RoadmapCapsule>
    </div>
  {/each}
  <div class="pointer-events-none absolute right-0 h-[220px] w-[220px] translate-y-1/2">
    <img
      alt="Illustration of a panda practicing piano"
      class="h-full w-full object-cover"
      src="/images/app/panda.png"
    />
  </div>
</section>
