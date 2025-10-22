<script lang="ts">
  import { onMount } from 'svelte';
  import { VexFlow, type DebugGridOptions } from '$lib/vexflow/vexflow-core';
  import type { PageProps } from './$types';
  import { Button } from '$lib/components/ui/button/index';
  import GridOverlayControl from '$lib/components/debug/GridOverlayControl.svelte';
  import TempoSlider from '$lib/components/ui/TempoSlider.svelte';
  import MovingStaff from '$lib/components/staff/MovingStaff.svelte';
  import type { DebugGridPlugin } from '$lib/staff/plugins/debug-grid';
  import PianoKeyboard from '$lib/components/piano-keyboard/piano-keyboard.svelte';
  import { noteCoordinator } from '$lib/note-events/noteCoordinator';
  import type { RoutedNoteEvent } from '$lib/note-events/types';

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
  let matchedNoteId: string | null = null;
  const noteSourceAllowList = new Set(['pc-keybord', 'piano-ui']);

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
    matchedNoteId = null;
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

  const normalizeEventNote = (event: RoutedNoteEvent): string | null => {
    const raw = event.note?.trim();
    if (!raw) return null;
    const letter = raw.charAt(0)?.toUpperCase();
    if (!letter) return null;
    const hasSharp = event.sharp === true || raw.includes('#');
    const hasFlat = !hasSharp && raw.includes('b');
    const accidental = hasSharp ? '#' : hasFlat ? 'b' : '';
    const octave = Number.isFinite(event.octave) ? event.octave : Number.NaN;
    if (!Number.isFinite(octave)) return null;
    return `${letter}${accidental}${octave}`;
  };

  const getExpectedNote = (): string | null => {
    const metadata = movingStaff?.getCurrentNoteMetadata();
    if (!metadata) return null;
    if (metadata.isRest) return null;
    return metadata.normalized || null;
  };

  const handlePrimaryNoteEvent = (event: RoutedNoteEvent) => {
    if (!noteSourceAllowList.has(event.originId)) return;
    const normalizedEvent = normalizeEventNote(event);
    if (!normalizedEvent) return;

    if (event.type === 'noteon') {
      if (matchedNoteId) return;
      const expected = getExpectedNote();
      if (!expected) return;
      if (normalizedEvent === expected) {
        movingStaff?.onNoteOn();
        matchedNoteId = normalizedEvent;
      }
      return;
    }

    if (event.type === 'noteoff') {
      if (!matchedNoteId) return;
      if (normalizedEvent === matchedNoteId) {
        movingStaff?.onNoteOff();
        matchedNoteId = null;
      }
    }
  };

  onMount(() => {
    const unsubscribe = noteCoordinator.onPrimary(handlePrimaryNoteEvent);
    return () => {
      unsubscribe();
      matchedNoteId = null;
    };
  });
</script>

<Button variant="link" href="/layout">layout</Button>
<Button variant="link" href="/demo">more demos</Button>

<svelte:document
  onkeydown={(e) => {
    if (e.key === 'r') {
      matchedNoteId = null;
      movingStaff?.reset();
    }
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
    plugins={['debug-grid', 'trailing-staves', 'cursor']}
    onready={onStaffReady}
  />
{/key}

<div class="controls-row">
  <GridOverlayControl bind:enabled={debugGridEnabled} bind:options={gridOptions} />
  <Button
    id="renderButton"
    type="button"
    onclick={() => {
      matchedNoteId = null;
      version += 1;
    }}>rerender</Button
  >
  <Button id="pauseButton" type="button" onclick={() => movingStaff?.stop()}>pause</Button>
  <Button id="resumeButton" type="button" onclick={() => movingStaff?.move()}>resume</Button>
  <Button
    id="resetButton"
    type="button"
    onclick={() => {
      matchedNoteId = null;
      movingStaff?.reset();
    }}>reset</Button
  >
</div>

<div class="ml-2 flex h-16 w-42 items-center justify-center rounded-xl bg-[#f3f3f3]">
  <TempoSlider bind:value={tempo} min={40} max={200} step={5} />
</div>

<PianoKeyboard />

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
