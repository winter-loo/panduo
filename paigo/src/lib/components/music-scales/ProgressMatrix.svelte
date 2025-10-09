<script lang="ts">
  type ProgressMatrixProps = {
    rows?: boolean[][];
  };

  const props = $props<ProgressMatrixProps>();
  const rows = $derived(props.rows ?? []);
</script>

<div class="flex flex-col gap-[10px]">
  {#each rows as row, rowIndex}
    <div class="flex gap-[10px]">
      {#each row as cell, cellIndex}
        <div
          class={`h-[14px] w-[14px] rounded-[4px] ${cell ? 'bg-[#58cc02]' : 'bg-[#e0e0e0]'}`}
          aria-hidden="true"
          data-cell={`r${rowIndex}-c${cellIndex}`}
        ></div>
      {/each}
    </div>
  {/each}
</div>
