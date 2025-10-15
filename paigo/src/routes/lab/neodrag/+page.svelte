<script lang="ts">
  import { draggable, axis, controls, ControlFrom } from '@neodrag/svelte';
</script>

<div id="foo" class="mt-10 overflow-hidden">
  <div
    class="relative inline-block"
    {@attach draggable([
      axis('x'),
      controls({
        allow: ControlFrom.selector('.handle'),
      }),
    ])}
  >
    <div class="handle absolute top-0 left-0 z-10 h-8 w-full cursor-move bg-red-500/30"></div>
    <div class="nodes-container border-4 inline-flex flex-row flex-nowrap">
      <!-- <div class="handle h-2 w-full flex-none cursor-move bg-red-500"></div> -->
      {#each Array.from({ length: 50 }) as _}
        <div class="mx-5 h-20 w-10 flex-none bg-teal-500"></div>
      {/each}
    </div>
  </div>
</div>
