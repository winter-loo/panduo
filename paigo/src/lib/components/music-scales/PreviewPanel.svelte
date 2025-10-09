<script lang="ts">
  import ProgressMatrix from './ProgressMatrix.svelte';

  type PreviewPanelProps = {
    matrix?: boolean[][];
  };

  const props = $props<PreviewPanelProps>();
  const matrix = $derived(props.matrix ?? []);
</script>

<section class="flex w-full flex-col gap-6">
  <div class="rounded-2xl border-2 border-[#e0e0e0] bg-white px-8 py-7">
    <ProgressMatrix rows={matrix} />
  </div>
  <div class="h-[191px] rounded-2xl border-2 border-dashed border-[#e0e0e0] bg-white/60"></div>
  <div class="h-[191px] rounded-2xl border-2 border-dashed border-[#e0e0e0] bg-white/60"></div>
</section>
