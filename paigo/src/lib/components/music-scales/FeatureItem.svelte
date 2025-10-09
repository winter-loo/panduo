<script lang="ts">
  import type { ComponentType } from 'svelte';

  type FeatureItemProps = {
    icon: ComponentType;
    label: string;
  };

  const props = $props<FeatureItemProps>();
  const icon = $derived(props.icon);
  const label = $derived(props.label);
</script>

<div class="flex items-center gap-5 rounded-xl px-7 py-7">
  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#4d4d4d]">
    <svelte:component this={icon} class="h-6 w-6" />
  </div>
  <span class="text-[32px] font-normal leading-none text-[#4d4d4d]">{label}</span>
</div>
