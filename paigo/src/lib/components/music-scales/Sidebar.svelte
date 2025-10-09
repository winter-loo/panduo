<script lang="ts">
  import FeatureItem from './FeatureItem.svelte';
  import type { ComponentType } from 'svelte';

  export type Feature = {
    icon: ComponentType;
    label: string;
  };

  type SidebarProps = {
    features?: Feature[];
  };

  const props = $props<SidebarProps>();
  const features = $derived(props.features ?? []);
</script>

<aside
  class="flex h-full w-full lg:max-w-[256px] flex-col border-b border-[#e0e0e0] bg-[#f3f3f3] px-5 py-6 lg:border-b-0 lg:border-r"
>
  <div class="px-8 pb-8 pt-14">
    <p class="text-[48px] font-normal leading-none text-[#58cc02]">panduo</p>
  </div>
  <nav class="flex flex-1 flex-col gap-2">
    {#each features as feature (feature.label)}
      <FeatureItem icon={feature.icon} label={feature.label} />
    {/each}
  </nav>
</aside>
