<script lang="ts">
  import { VexFlow, type DebugGridOptions } from '$lib/vexflow/vexflow-core';
  import type { PageProps } from './$types';
  import { Button } from '$lib/components/ui/button/index';
  import GridOverlayControl from '$lib/components/debug/GridOverlayControl.svelte';
  import TempoSlider from '$lib/components/ui/TempoSlider.svelte';
  import MovingStaff from '$lib/components/staff/MovingStaff.svelte';
  import type MovingStaffComponent from '$lib/components/staff/MovingStaff.svelte';
  import type { MovingStaffController, StaffLayout } from '$lib/staff/moving-staff-controller';
  import type { DebugGridPlugin } from '$lib/staff/plugins/debug-grid';

  const { data }: PageProps = $props();

  let vexflowError = $state('');
  try {
    const musicFontName = 'Bravura';
    VexFlow.setFonts(`${musicFontName}`);
  } catch (error) {
    console.error('VexFlow initialization error:', error);
    vexflowError = error instanceof Error ? error.message : 'Unknown error';
  }

  VexFlow.NoteHead.DEBUG = true;
  VexFlow.Stem.DEBUG = true;
  VexFlow.StaveNote.DEBUG = true;
  VexFlow.Formatter.DEBUG = true;
  VexFlow.EasyScore.DEBUG = true;
  VexFlow.ModifierContext.DEBUG = true;

  let movingStaffComponent: MovingStaffComponent | null = null;

  let noteSpanVisible = $state(false);
  let tempo = $state(data.song.tempo ?? 60);

  const NOTE_SCALE_DURATION = 200;
  const NOTESPAN_EXPAND_DELAY = 60;
  const NOTESPAN_HOLD_DURATION = 200;

  let pointerHoldActive = false;
  let skipNextClick = false;

  function toggleNoteSpan() {
    noteSpanVisible = !noteSpanVisible;
    // movingStaffComponent?.setNoteSpanVisibleState(noteSpanVisible);
  }

  function runNextNoteReleaseAnimation() {
    const note = movingStaffComponent?.startScalePulseAnimation();
    if (!note) {
      movingStaffComponent?.stopNoteSpanPreview();
      return;
    }

    note.noteSpans.forEach((span) => {
      span.startHaloPulseAnimation(NOTESPAN_EXPAND_DELAY, NOTESPAN_HOLD_DURATION);
    });

    if (typeof window === 'undefined') {
      note.setScalePulseState(false);
      movingStaffComponent?.stopNoteSpanPreview();
      return;
    }

    window.setTimeout(() => note.setScalePulseState(false), NOTE_SCALE_DURATION);
    window.setTimeout(
      () => movingStaffComponent?.stopNoteSpanPreview(),
      NOTESPAN_EXPAND_DELAY + NOTESPAN_HOLD_DURATION,
    );
  }

  function handleNextNotePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    pointerHoldActive = true;
    skipNextClick = true;
    movingStaffComponent?.startNoteSpanPreview();
    movingStaffComponent?.goToNextNote();
  }

  function handleNextNotePointerUp() {
    if (!pointerHoldActive) return;
    pointerHoldActive = false;
    runNextNoteReleaseAnimation();
  }

  function handleNextNotePointerLeave() {
    if (!pointerHoldActive) {
      skipNextClick = false;
      return;
    }
    pointerHoldActive = false;
    skipNextClick = false;
    movingStaffComponent?.stopNoteSpanPreview();
  }

  function handleNextNoteClick() {
    if (skipNextClick) {
      skipNextClick = false;
      return;
    }
    movingStaffComponent?.goToNextNote();
  }

  $effect(() => {
    if (!movingStaffComponent) return;
    movingStaffComponent.setTempo(tempo);
    tempo = movingStaffComponent.getTempo();
  });

  // debug grid settings
  // [
  let debugGridEnabled = $state(false);
  let gridOptions = $state<DebugGridOptions>({});

  const getDebugGridPlugin = (): DebugGridPlugin | undefined =>
    movingStaffComponent?.getPlugin<DebugGridPlugin>('debug-grid');

  function onStaffReady() {
    const plugin = getDebugGridPlugin();
    if (!plugin) return;
    // get the initial plugin configuration
    gridOptions = plugin.getOptions();
  }

  $effect(() => {
    // Capture reactive inputs up front so the effect re-runs when either value changes,
    // even if the plugin is not ready yet.
    // see issue: https://github.com/sveltejs/svelte/issues/16929
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

<svelte:document
  onkeydown={(e) => {
    if (e.key === 'r') movingStaffComponent?.reset();
  }}
/>

{#if vexflowError}
  <div class="error">
    <p>VexFlow Error: {vexflowError}</p>
  </div>
{/if}

{#key version}
  <MovingStaff
    bind:this={movingStaffComponent}
    song={data.song}
    tempo={tempo ?? undefined}
    movable={true}
    plugins={['debug-grid']}
    onready={onStaffReady}
  />
{/key}

<div class="controls-row">
  <GridOverlayControl bind:enabled={debugGridEnabled} bind:options={gridOptions} />
  <Button id="renderButton" type="button" onclick={() => (version += 1)}>rerender</Button>
  <Button id="pauseButton" type="button" onclick={() => movingStaffComponent?.stop()}>pause</Button>
  <Button id="resumeButton" type="button" onclick={() => movingStaffComponent?.move()}
    >resume</Button
  >
  <Button id="resetButton" type="button" onclick={() => movingStaffComponent?.reset()}>reset</Button
  >
  <Button type="button" onclick={toggleNoteSpan}>
    {noteSpanVisible ? 'hide span' : 'show span'}
  </Button>
  <Button
    type="button"
    onpointerdown={handleNextNotePointerDown}
    onpointerup={handleNextNotePointerUp}
    onpointerleave={handleNextNotePointerLeave}
    onpointercancel={handleNextNotePointerLeave}
    onclick={handleNextNoteClick}
  >
    next note
  </Button>
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
