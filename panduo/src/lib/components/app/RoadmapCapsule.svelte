<script lang="ts">
  const { children, label, showLoop = false } = $props();
</script>

<div class="relative flex h-[164px] w-[164px] items-center justify-center">
  {#if showLoop}
    <span
      class="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-white/35 bg-[#111827] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_12px_20px_rgba(7,12,23,0.55)]"
    >
      loop
    </span>
  {/if}

  <div
    class="relative flex h-full w-full items-center justify-center rounded-[52px] border border-white/45 bg-[linear-gradient(180deg,#141c2f_5%,#070b16_95%)] shadow-[0_34px_60px_rgba(5,10,20,0.55)]"
  >
    <div class="absolute inset-[14px] rounded-[40px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(21,34,58,0.26)_100%)]"></div>
    <div class="absolute inset-[14px] rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_60%)]"></div>

    <div
      class="relative flex h-[118px] w-[118px] flex-col items-center justify-center gap-[16px] rounded-[34px] border border-white/25 bg-[linear-gradient(180deg,#ffab4a_0%,#ff7d2a_100%)] text-white shadow-[0_18px_36px_rgba(255,130,40,0.45)]"
    >
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(252,203,145,0.2)_100%)] text-[#78360f] shadow-[0_8px_18px_rgba(90,32,8,0.35)]"
      >
        {@render children()}
      </div>
      <span class="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/95">{label}</span>
    </div>
  </div>
</div>
