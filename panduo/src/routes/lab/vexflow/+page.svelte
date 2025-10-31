<script lang="ts">
  import {
    RenderContext,
    Renderer,
    Stave,
    StaveNote,
    VexFlow,
    type StaveNoteStruct,
  } from '$lib/vexflow/vexflow-core';
  import { onMount } from 'svelte';

  let staffRef: HTMLDivElement | null = null;

  onMount(() => {
    let renderer = new VexFlow.Renderer(staffRef!, VexFlow.Renderer.Backends.SVG);
    renderer.resize(800, 300);
    const staff = new Stave(0, 0, 200);
    staff.setContext(renderer.getContext()).draw();
    const staveNote = new VexFlow.StaveNote({ keys: ['c/4'], duration: '4', autoStem: true });
    VexFlow.Formatter.FormatAndDraw(
      renderer.getContext(),
      staff,
      { notes: [staveNote] },
      {
        params: {
          autoBeam: true,
        },
      },
    );
  });
</script>

<section>
  <div class="staff" bind:this={staffRef}></div>
</section>
