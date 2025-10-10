<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { VexFlow, type RenderContext, type StaveNote } from '$lib/vexflow/vexflow-core';
  import {
    MovingStaffController,
    cloneLayout,
    type StaffLayout,
    type StaffSong,
  } from '$lib/staff/moving-staff-controller';

  type ConfigInstance = ReturnType<typeof VexFlow.Config.defaults>;
  type MovingStaffProps = {
    song: StaffSong;
    tempo?: number;
    noteSpanVisible?: boolean;
    movable?: boolean;
    containerClass?: string;
    id?: string;
    onready: (data: {
      controller: MovingStaffController;
      layout: StaffLayout;
      config: ConfigInstance;
    }) => void;
  };

  const { onready, ...props }: MovingStaffProps = $props();

  const containerClass = $derived(props.containerClass ?? 'w-[1016px] mx-auto mt-6 mb-10 p-8');
  const id = $derived(props.id ?? 'moving-staff');
  const movable = $derived(props.movable ?? false);

  let fixedElement: HTMLDivElement | null = null;
  let notesElement: HTMLDivElement | null = null;
  let layout: StaffLayout = cloneLayout();
  let config: ConfigInstance | null = null;
  let controller: MovingStaffController | null = $state(null);
  const dragAttachment = $derived.by(() => (movable && controller ? controller.draggable() : null));
  let lastSongRef: StaffSong | null = null;
  let noteSpanVisible = $derived(props.noteSpanVisible ?? false);
  let resolvedTempo = $derived(props.tempo ?? props.song?.tempo ?? 60);
  let initializeRunId = 0;
  // Guard against overlapping init runs so effects don't re-enter while the DOM is being rebuilt.
  let isInitializing = $state(false);

  const waitForAnimationFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const finishInitialization = (runId: number) => {
    if (runId === initializeRunId) {
      isInitializing = false;
    }
  };
  // TODO: add comments
  const computeDerivedPadding = (candidate: StaffLayout): number => {
    const numerator =
      candidate.staveHeight - candidate.spacingBetweenLinesPx * (candidate.numLines - 1);
    const denominator = 2 * candidate.spacingBetweenLinesPx;
    return Math.max(0, Math.floor(numerator / denominator));
  };

  const parseBeats = (timeSignature: string): { beats: number; beatUnit: number } => {
    const [beatsText = '4', unitText = '4'] = timeSignature.split('/');
    const beats = Number.parseInt(beatsText, 10);
    const beatUnit = Number.parseInt(unitText, 10);
    return {
      beats: Number.isFinite(beats) && beats > 0 ? beats : 4,
      beatUnit: Number.isFinite(beatUnit) && beatUnit > 0 ? beatUnit : 4,
    };
  };

  const buildConfig = (candidate: StaffLayout): ConfigInstance => {
    const padding = computeDerivedPadding(candidate);
    return VexFlow.Config.create({
      quarterNoteWidth: 112,
      fontSize: 60,
      Stem: {
        width: 6,
        height: 70,
      },
      NoteHead: {
        pointerRect: false,
      },
      Stave: {
        spacingBetweenLinesPx: candidate.spacingBetweenLinesPx,
        spaceAboveStaffLn: padding,
        spaceBelowStaffLn: padding,
        style: {
          lineWidth: 4,
          strokeStyle: '#dadada',
        },
        leftBar: {
          width: 4,
          style: {
            fillStyle: '#dadada',
          },
        },
        rightBar: false,
        paddingLeft: 4,
      },
      Clef: {
        defaults: {
          style: {
            fillStyle: '#afafaf',
          },
        },
        types: {},
      },
      TimeSignature: {
        fillStyle: '#afafaf',
      },
      KeySignature: {
        fillStyle: '#afafaf',
      },
    });
  };

  const updateLayoutDimensions = (candidate: StaffLayout, cfg: ConfigInstance) => {
    const beatsInMeasure = cfg.get('beatsInMeasure');
    const beatUnit = cfg.get('beatUnit');
    const quarterNoteWidth = cfg.get('quarterNoteWidth');
    const width =
      (quarterNoteWidth * beatsInMeasure * 4) /
      (Number.isFinite(beatUnit) && beatUnit !== 0 ? beatUnit : 4);
    candidate.measureWidth = width;
  };

  const applyTimeSignature = (cfg: ConfigInstance, timeSignature: string) => {
    const { beats, beatUnit } = parseBeats(timeSignature);
    cfg.setBeatsInMeasure(beats);
    cfg.setBeatUnit(beatUnit);
  };

  /**
   * Prepare controller, renderer, and initial stave for the current song data.
   * Rebuilds everything whenever the song reference changes.
   */
  const initialize = async () => {
    const song = props.song;
    if (!song) return;
    const runId = ++initializeRunId;
    isInitializing = true;
    const runSong = song;

    try {
      controller?.destroy();
      controller = null;

      if (!fixedElement || !notesElement) {
        return;
      }

      layout = cloneLayout();
      config = buildConfig(layout);
      applyTimeSignature(config, runSong.timeSignature);
      updateLayoutDimensions(layout, config);

      const maxOffsetX = runSong.measures.length * layout.measureWidth;
      const tempoForSong = props.tempo ?? runSong.tempo ?? resolvedTempo;

      controller = new MovingStaffController(
        layout,
        fixedElement,
        notesElement,
        maxOffsetX,
        config,
        tempoForSong,
        runSong.timeSignature,
        runSong.keySignature,
      );

      resolvedTempo = tempoForSong;
      lastSongRef = runSong;

      // Yield twice: once for DOM bindings (`tick()`), once for SVG renderer paint, then add measures.
      await tick();
      await waitForAnimationFrame();
      if (runId !== initializeRunId || props.song !== runSong || !controller) {
        return;
      }
      populateSong(runSong);

      onready({ controller, layout, config });
    } finally {
      finishInitialization(runId);
    }
  };

  /**
   * Draw measures and notes for the provided song snapshot.
   */
  const populateSong = (target: StaffSong) => {
    if (!controller) return;
    controller.prepareForRedraw();
    controller.maxOffsetX = target.measures.length * layout.measureWidth;
    controller.setNoteSpanVisible(noteSpanVisible);
    target.measures.forEach((measure, index) => {
      controller?.addMeasure(
        target.timeSignature,
        measure.notes,
        index + 1 === target.measures.length,
      );
    });
    controller.setTiming(resolvedTempo, target.timeSignature);
  };

  onMount(() => {
    void initialize();
  });

  onDestroy(() => {
    controller?.destroy();
  });

  $effect(() => {
    const song = props.song;
    if (!controller || !config || !song) return;
    if (isInitializing) return;

    controller.setTiming(resolvedTempo, song.timeSignature);
    controller.setNoteSpanVisible(noteSpanVisible);

    if (song && song !== lastSongRef) {
      void initialize();
    }

    if (!movable && controller) {
      controller.stop();
    }
  });

  export function redraw(nextSong?: StaffSong) {
    if (isInitializing) return;
    if (!controller) {
      void initialize();
      return;
    }
    populateSong(nextSong ?? props.song);
  }

  export function getController(): MovingStaffController | null {
    return controller;
  }

  export function getContext(): RenderContext | null {
    return controller?.context ?? null;
  }

  export function getLayout(): StaffLayout | null {
    return controller ? controller.getLayout() : null;
  }

  export function getConfig(): ConfigInstance | null {
    return config;
  }

  export function goToNextNote() {
    controller?.goToNextNote();
  }

  export function startNoteSpanPreview() {
    controller?.startNoteSpanPreview();
  }

  export function stopNoteSpanPreview() {
    controller?.stopNoteSpanPreview();
  }

  export function startScalePulseAnimation(): StaveNote | null {
    return controller?.startScalePulseAnimation() ?? null;
  }

  export function reset() {
    controller?.reset();
  }

  export function move() {
    if (!movable) return;
    controller?.move();
  }

  export function stop() {
    controller?.stop();
  }

  export function setTempo(nextTempo: number) {
    const sanitized = Number.isFinite(nextTempo) && nextTempo > 0 ? nextTempo : resolvedTempo;
    resolvedTempo = sanitized;
    controller?.setTiming(sanitized, props.song.timeSignature);
  }

  export function getTempo(): number {
    return controller?.getTempo() ?? resolvedTempo;
  }

  export function setNoteSpanVisibleState(visible: boolean) {
    noteSpanVisible = visible;
    controller?.setNoteSpanVisible(visible);
  }
</script>

<div {id} class={containerClass}>
  <div bind:this={fixedElement}></div>
  <div id="notes-viewport">
    <div id="notes-container" bind:this={notesElement} {@attach dragAttachment}></div>
  </div>
</div>

<style>
  #moving-staff {
    display: flex;
    justify-content: center;
    flex-direction: row;
    position: relative;
    z-index: 2;
    box-shadow:
      inset 2px 2px 4px rgba(243, 243, 243, 1),
      inset -2px -2px 4px rgba(0, 0, 0, 0.25);
  }

  #notes-viewport {
    width: 100%;
    overflow: hidden;
    cursor: grab;
    user-select: none;
  }
</style>
