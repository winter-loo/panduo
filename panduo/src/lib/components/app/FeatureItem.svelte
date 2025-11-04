<script lang="ts">
  const { children, label } = $props();
</script>

<div class="flex items-center gap-5 rounded-xl px-7 py-7">
  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#4d4d4d]">
    {@render children()}
  </div>
  <span class="text-[32px] leading-none font-normal text-[#4d4d4d]">{label}</span>
</div>
