<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';

  let donutCount = $state(0);

  const donutWidths = [0, 180, 72, 72, 180, 180, 72, 72];

  function showDonut() {
    donutCount += 1;
  }
</script>

<Button onclick={showDonut}>add donut</Button>

{#snippet donut(width: number)}
  {#if donutCount > 0}
    <div class="donut relative">
      <div class="inner absolute bg-cyan-300 rounded-full" style:width="{width}px">{width}</div>
      <div
        class="outter absolute w-[100%] h-56 -top-18 -right-18 -bottom-18 -left-18 border-9 rounded-full border-cyan-400"
      ></div>
    </div>
  {:else}
    {width + 36}
  {/if}
{/snippet}

<div class="line relative flex items-center w-1296 h-128">
  <div class="dura-4 w-216 h-20 ml-216 bg-red-200">
    {@render donut(180)}
  </div>
  <div class="dura-8 w-108 h-20 mt-20 bg-red-200">
    {@render donut(72)}
  </div>
  <div class="dura-8 w-108 h-20 bg-red-200">
    {@render donut(72)}
  </div>
  <div class="barline absolute left-632 h-100 w-9 bg-[#d7d7d7] opacity-50"></div>
  <div class="dura-4 w-216 h-20 mb-20 bg-red-200">
    {@render donut(180)}
  </div>
  <div class="dura-4 w-216 h-20 bg-red-200">
    {@render donut(180)}
  </div>
  <div class="dura-8 w-108 h-20 mt-20 bg-red-200">
    {@render donut(72)}
  </div>
  <div class="dura-8 w-108 h-20 bg-red-200">
    {@render donut(72)}
  </div>
  <!-- 216*3*2-9-7 -->
  <div class="barline absolute left-1280 h-100 w-9 bg-[#d7d7d7] opacity-50"></div>
</div>

<style>
  .line {
    --spacing: 1px;
  }
</style>
