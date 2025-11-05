<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  const { children, label, showLoop = false } = $props();
</script>

<div class="relative flex h-[78px] w-[106px] items-center justify-center">
  <button
    class="flex h-full w-full items-center justify-center rounded-[50%/50%] bg-[var(--app-color-500)]
    shadow-[0_8px_0_0_var(--app-color-600)] hover:bg-[var(--app-color-520)] active:translate-y-2
    active:shadow-[0_0_var(--app-color-600)]"
  >
    {@render children()}
  </button>
</div>
