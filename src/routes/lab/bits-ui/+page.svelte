<script lang="ts">
  import { Slider } from 'bits-ui';

  let value = $state(60);
</script>

<div class="mt-20 ml-20 w-full md:max-w-[280px]">
  <Slider.Root
    step={5}
    min={40}
    max={200}
    type="single"
    bind:value
    class="relative flex w-full touch-none select-none items-center"
  >
    {#snippet children({ tickItems })}
      <span class="bg-dark-10 relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full">
        <Slider.Range class="bg-foreground absolute h-full" />
      </span>
      <Slider.Thumb
        index={0}
        class="border-border-input bg-background hover:border-dark-40 focus-visible:ring-foreground dark:bg-foreground dark:shadow-card data-active:border-dark-40 z-5 focus-visible:outline-hidden data-active:scale-[0.98] block size-[25px] cursor-pointer rounded-full border shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      />
      {#each tickItems as { index } (index)}
        <Slider.Tick {index} class="dark:bg-background/20 bg-background z-1 h-2 w-[1px]" />
      {/each}
      <Slider.ThumbLabel index={0} class="mb-1">BPM: {value}</Slider.ThumbLabel>
    {/snippet}
  </Slider.Root>
</div>
