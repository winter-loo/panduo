<script lang="ts">
  const { children, label } = $props();
</script>

<div class="flex items-center gap-5 rounded-xl px-7 py-7 text-[var(--app-color-300)] hover:text-[var(--app-color-700)]">
  <div class="flex h-8 w-8 items-center justify-center">
    {@render children()}
  </div>
  <span class="text-xl leading-none font-normal">{label}</span>
</div>
