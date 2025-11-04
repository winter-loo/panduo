<script lang="ts">
  import FeatureItem from './FeatureItem.svelte';
  import type { Component } from 'svelte';

  export type Feature = {
    icon: Component;
    label: string;
  };

  type SidebarProps = {
    features?: Feature[];
  };

  const props: SidebarProps = $props();
  const features = $derived(props.features ?? []);
</script>

<aside
  class="flex h-full w-full flex-col border-b border-[#e0e0e0] bg-[var(--app-color-100)] px-5 py-6 lg:max-w-[256px] lg:border-r lg:border-b-0"
>
  <div class="px-8 pt-14 pb-8">
    <p class="text-[48px] leading-none font-normal text-[#58cc02]">panduo</p>
  </div>
  <nav class="flex flex-1 flex-col gap-2">
    {#each features as feature (feature.label)}
      <FeatureItem label={feature.label}>
        <feature.icon class="h-7 w-7" />
      </FeatureItem>
    {/each}
  </nav>
</aside>
