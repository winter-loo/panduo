<script lang="ts">
  import { VexFlow, type DebugGridOptions } from '$lib/vexflow/vexflow-core';
  import type { PageProps } from './$types';
  import { Button } from '$lib/components/ui/button/index';
  import GridOverlayControl from '$lib/components/debug/GridOverlayControl.svelte';
  import TempoSlider from '$lib/components/ui/TempoSlider.svelte';
  import MovingStaff from '$lib/components/staff/MovingStaff.svelte';
  import type { DebugGridPlugin } from '$lib/staff/plugins/debug-grid';

  const { data }: PageProps = $props();

  // initialize Vexflow
  let vexflowError = $state('');
  try {
    const musicFontName = 'Bravura';
    VexFlow.setFonts(`${musicFontName}`);
  } catch (error) {
    console.error('VexFlow initialization error:', error);
    vexflowError = error instanceof Error ? error.message : 'Unknown error';
  }

  let movingStaff = $state<MovingStaff | null>(null);

  let tempo = $state(data.song.tempo ?? 60);

  $effect(() => {
    movingStaff?.setTempo(tempo);
  });

  // debug grid settings
  // [
  let debugGridEnabled = $state(false);
  let gridOptions = $state<DebugGridOptions>({});

  const getDebugGridPlugin = (): DebugGridPlugin | undefined =>
    movingStaff?.getPlugin<DebugGridPlugin>('debug-grid');

  function onStaffReady() {
    const plugin = getDebugGridPlugin();
    // get the initial plugin configuration
    gridOptions = plugin?.getOptions() ?? {};
  }

  $effect(() => {
    // Capture reactive inputs up front so the effect re-runs when either value changes,
    // even if the plugin is not ready yet.
    // See issue: https://github.com/sveltejs/svelte/issues/16929.
    // Use 'plguin?' syntax can not save you.
    const enabled = debugGridEnabled;
    const options = gridOptions;
    const plugin = getDebugGridPlugin();
    if (!plugin) return;
    plugin.handleToggle({ enabled });
    plugin.handleOptionsChange({ options });
  });
  // ]

  let version = $state(0);
</script>

<Button variant="link" href="/layout">layout</Button>
<Button variant="link" href="/demo">more demos</Button>

<svelte:document
  onkeydown={(e) => {
    if (e.key === 'r') movingStaff?.reset();
  }}
/>

{#if vexflowError}
  <div class="error">
    <p>VexFlow Error: {vexflowError}</p>
  </div>
{/if}

{#key version}
  <MovingStaff
    bind:this={movingStaff}
    song={data.song}
    tempo={tempo ?? undefined}
    movable={true}
    plugins={['debug-grid']}
    onready={onStaffReady}
    cursor
  />
{/key}

<div class="controls-row">
  <GridOverlayControl bind:enabled={debugGridEnabled} bind:options={gridOptions} />
  <Button id="renderButton" type="button" onclick={() => (version += 1)}>rerender</Button>
  <Button id="pauseButton" type="button" onclick={() => movingStaff?.stop()}>pause</Button>
  <Button id="resumeButton" type="button" onclick={() => movingStaff?.move()}>resume</Button>
  <Button id="resetButton" type="button" onclick={() => movingStaff?.reset()}>reset</Button>
  <Button
    type="button"
    onpointerdown={() => movingStaff?.onNoteOn()}
    onpointerup={() => movingStaff?.onNoteOff()}>next note</Button
  >
</div>

<div class="bg-[#f3f3f3] ml-2 w-42 h-16 flex items-center justify-center rounded-xl">
  <TempoSlider bind:value={tempo} min={40} max={200} step={5} />
</div>

<style>
  .controls-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1rem;
    align-items: center;
  }

  :global(.notespan-click-target) {
    cursor: pointer;
  }
</style>
