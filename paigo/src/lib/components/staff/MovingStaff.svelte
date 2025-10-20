<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { VexFlow, type RenderContext, type StaveNote } from '$lib/vexflow/vexflow-core';
  import {
    MovingStaffController,
    cloneLayout,
    type StaffLayout,
    type StaffSong,
    type StaffNoteMetadata,
  } from '$lib/staff/moving-staff-controller';
  import { createDebugGridPlugin, type DebugGridPluginConfig } from '$lib/staff/plugins/debug-grid';
  import { createCursorPlugin, type CursorPluginOptions } from '$lib/staff/plugins/cursor';
  import { createTrailingStavesPlugin } from '$lib/staff/plugins/trailing-staves';
  import type {
    MovingStaffPluginInstance,
    MovingStaffPluginSpec,
  } from '$lib/staff/plugins/plugin-types';

  type ConfigInstance = ReturnType<typeof VexFlow.Config.defaults>;
  type MovingStaffProps = {
    song: StaffSong;
    tempo?: number;
    movable?: boolean;
    plugins?: PluginSpec[];
    onready?: (data: {
      controller: MovingStaffController;
      layout: StaffLayout;
      config: ConfigInstance;
    }) => void;
  };

  const { onready, ...props }: MovingStaffProps = $props();

  type DebugGridSpec = MovingStaffPluginSpec<'debug-grid', DebugGridPluginConfig>;
  type CursorSpec = MovingStaffPluginSpec<'cursor', CursorPluginOptions>;
  type TrailingStavesSpec = MovingStaffPluginSpec<'trailing-staves', void>;
  type PluginSpec = DebugGridSpec | CursorSpec | TrailingStavesSpec;

  const BUILTIN_PLUGINS = {
    'debug-grid': createDebugGridPlugin,
    cursor: createCursorPlugin,
    'trailing-staves': createTrailingStavesPlugin,
  } as const;

  // Registry of active plugin instances (exposed to parents via `bind:this` for diagnostics).
  const pluginRegistry: Record<string, MovingStaffPluginInstance> = {};
  export const plugins = pluginRegistry;

  /**
   * Produce a stable key that describes the requested plugins and their options.
   *
   * We rely on this key to know when the plugin set has changed so we can rebuild the active
   * instances. Options are JSON-stringified with functions filtered out because JSON cannot encode
   * them, and we treat any serialization failure as an empty options blob, which forces a refresh.
   * Example output: "debug-grid:{\"spacing\":20}|debug-grid:{}", ensuring order-sensitive hashing.
   */
  const computePluginKey = (specs: PluginSpec[]): string =>
    specs
      .map((spec) => {
        if (typeof spec === 'string') return spec;
        const optionsKey = (() => {
          try {
            return JSON.stringify(spec.options ?? {}, (_, value) =>
              typeof value === 'function' ? '__fn__' : value,
            );
          } catch {
            return '';
          }
        })();
        return `${spec.name}:${optionsKey}`;
      })
      .join('|');

  type NormalizedPluginSpec =
    | { name: 'debug-grid'; options?: DebugGridPluginConfig }
    | { name: 'cursor'; options?: CursorPluginOptions }
    | { name: 'trailing-staves'; options?: undefined };

  const normalizePluginSpec = (spec: PluginSpec): NormalizedPluginSpec => {
    if (typeof spec === 'string') {
      if (spec === 'trailing-staves') {
        return { name: 'trailing-staves', options: undefined };
      }
      if (spec === 'cursor') {
        return { name: 'cursor', options: undefined };
      }
      return { name: spec, options: undefined };
    }
    if (spec.name === 'trailing-staves') {
      return { name: 'trailing-staves', options: undefined };
    }
    return spec;
  };

  let currentPluginKey: string | null = null;

  // Freeze the movable flag at mount so later prop changes cannot mutate controller behavior mid-drag.
  const isMovable = props.movable ?? false;

  let fixedElement: HTMLDivElement | null = null;
  let notesElement: HTMLDivElement | null = null;
  let layout: StaffLayout = cloneLayout();
  let config: ConfigInstance | null = null;
  let controller: MovingStaffController | null = $state(null);
  const dragAttachment = $derived.by(() =>
    isMovable && controller ? controller.draggable() : null,
  );
  let lastSongRef: StaffSong | null = null;
  let resolvedTempo = $derived(props.tempo ?? props.song?.tempo ?? 60);
  let renderRunId = 0;

  const destroyPlugins = (resetKey = true) => {
    for (const [name, instance] of Object.entries(pluginRegistry)) {
      instance.destroy?.();
      delete pluginRegistry[name];
    }
    if (resetKey) {
      currentPluginKey = null;
    }
  };

  const notifySongRendered = (song: StaffSong) => {
    Object.values(pluginRegistry).forEach((plugin) => {
      plugin.onSongRendered?.({ song });
    });
  };

  // Manage plugin lifecycle whenever the caller tweaks plugin definitions or we reload the layout.
  const refreshPlugins = (
    specs: PluginSpec[],
    options: { force?: boolean; layoutOverride?: StaffLayout } = {},
  ) => {
    const currentController = controller;
    const currentConfig = config;
    if (!currentController || !currentConfig) return;
    const key = computePluginKey(specs);
    if (!options.force && currentPluginKey === key) {
      return;
    }

    const effectiveLayout = options.layoutOverride ?? currentController.getLayout() ?? layout;
    const context = currentController.getContext();
    const savedStates: Record<string, unknown> = {};

    for (const [name, instance] of Object.entries(pluginRegistry)) {
      if (typeof instance.serialize === 'function') {
        savedStates[name] = instance.serialize();
      }
    }

    destroyPlugins(false);

    const readyQueue: MovingStaffPluginInstance[] = [];

    specs.forEach((spec) => {
      const normalized = normalizePluginSpec(spec);
      const factory = BUILTIN_PLUGINS[normalized.name];
      if (!factory) return;
      const instance = factory({
        controller: currentController,
        layout: effectiveLayout,
        config: currentConfig,
        context,
        state: savedStates[normalized.name] as never,
        options: normalized.options,
      });
      pluginRegistry[normalized.name] = instance;
      readyQueue.push(instance);
    });

    currentPluginKey = key;
    readyQueue.forEach((plugin) => plugin.onReady?.());
  };

  export function getPlugin<T = MovingStaffPluginInstance>(name: string): T | undefined {
    return pluginRegistry[name] as T | undefined;
  }

  // Helper for layout: derive how much vertical padding we need so ledger lines stay balanced.
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
        rightBar: {
          width: 4,
          style: {
            fillStyle: '#dadada',
          },
        },
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

  const applyTimeSignature = (cfg: ConfigInstance, timeSignature?: string) => {
    const { beats, beatUnit } = parseBeats(timeSignature ?? '4/4');
    cfg.setBeatsInMeasure(beats);
    cfg.setBeatUnit(beatUnit);
  };

  /**
   * Prepare controller, renderer, and initial stave for the current song data.
   * Rebuilds everything whenever the song reference changes.
   */
  const renderStave = async () => {
    const song = props.song;
    if (!song) return;
    const runSong = song;
    const runId = ++renderRunId;

    // Ensure Svelte has flushed DOM updates before the lib touches it
    await tick();

    // If the lib needs layout (sizes/styles), wait one RAF so CSS is applied
    await new Promise((r) => requestAnimationFrame(r));

    // A later render call might have started while we awaited tick/RAF—abort this run if so.
    if (runId !== renderRunId) return;

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

    const nextController = new MovingStaffController(
      layout,
      fixedElement,
      notesElement,
      maxOffsetX,
      config,
      tempoForSong,
      runSong.timeSignature,
      runSong.keySignature,
    );
    controller = nextController;

    // Another render may have preempted us during controller construction; bail if that happened.
    if (runId !== renderRunId) return;

    resolvedTempo = tempoForSong;
    lastSongRef = runSong;

    for (const measure of runSong.measures) {
      if (runId !== renderRunId) {
        return;
      }
      nextController.addMeasure(measure.notes, runSong.timeSignature);
    }

    if (runId !== renderRunId) return;

    refreshPlugins(props.plugins ?? [], {
      force: true,
      layoutOverride: nextController.getLayout() ?? layout,
    });

    if (runId !== renderRunId) return;

    notifySongRendered(runSong);

    onready?.({ controller, layout, config });
  };

  onMount(() => {
    renderStave();
  });

  onDestroy(() => {
    destroyPlugins();
    controller?.destroy();
  });

  $effect(() => {
    const song = props.song;
    const pluginSpecs = props.plugins ?? [];
    if (!controller || !config || !song) return;

    if (song !== lastSongRef) {
      renderStave();
      return;
    }

    controller.setTiming(resolvedTempo, song.timeSignature ?? '4/4');

    refreshPlugins(pluginSpecs);
    notifySongRendered(song);
  });

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

  export function getCurrentNoteMetadata(): StaffNoteMetadata | null {
    return controller?.getCurrentNoteMetadata() ?? null;
  }

  export function getPendingNoteMetadata(): StaffNoteMetadata | null {
    return controller?.getPendingNoteMetadata() ?? null;
  }

  export function onNoteOn() {
    controller?.startNoteSpanPreview();
    controller?.goToNextNote();
  }

  export function startScalePulseAnimation(): StaveNote | null {
    return controller?.startScalePulseAnimation() ?? null;
  }

  export function onNoteOff(
    options: {
      scaleDuration?: number;
      spanExpandDelay?: number;
      spanHoldDuration?: number;
    } = {},
  ) {
    const { scaleDuration = 200, spanExpandDelay = 60, spanHoldDuration = 200 } = options;
    const note = controller?.startScalePulseAnimation();
    if (!note) {
      controller?.stopNoteSpanPreview();
      return;
    }

    note.noteSpans.forEach((span) => {
      span.startHaloPulseAnimation(spanExpandDelay, spanHoldDuration);
    });

    if (typeof window === 'undefined') {
      note.setScalePulseState(false);
      controller?.stopNoteSpanPreview();
      return;
    }

    window.setTimeout(() => note.setScalePulseState(false), scaleDuration);
    window.setTimeout(() => controller?.stopNoteSpanPreview(), spanExpandDelay + spanHoldDuration);
  }

  export function reset() {
    controller?.reset();
  }

  export function move() {
    if (!isMovable) return;
    controller?.move();
  }

  export function stop() {
    controller?.stop();
  }

  export function setTempo(nextTempo: number) {
    const sanitized = Number.isFinite(nextTempo) && nextTempo > 0 ? nextTempo : resolvedTempo;
    resolvedTempo = sanitized;
    controller?.setTiming(sanitized, props.song.timeSignature ?? '4/4');
  }

  export function getTempo(): number {
    return controller?.getTempo() ?? resolvedTempo;
  }
</script>

<div class="flex flex-row justify-center">
  <div bind:this={fixedElement}></div>
  <div class="w-full overflow-hidden cursor-grab select-none">
    <div bind:this={notesElement} {@attach dragAttachment}></div>
  </div>
</div>
