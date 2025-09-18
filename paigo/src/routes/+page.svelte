<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    Metrics,
    Renderer,
    Stave,
    StemmableNote,
    VexFlow,
    type StaveNoteStruct,
  } from '$lib/vexflow/vexflow-core';
  import {
    applyVexflowMetrics,
    resolveStaffConfig,
    type ResolvedVexflowStaffConfig,
    type VexflowStaffConfig,
  } from '$lib/vexflow/staffConfig';
  import type { PageProps } from './$types';
  import { MovableElement } from '$lib/movable';
  import { Button } from '$lib/components/ui/button/index';

  const { data }: PageProps = $props();

  let BindingDom: {
    fixedClef?: HTMLElement;
    notesContainer?: HTMLElement;
  } = {};

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

  const staffOverrides: Partial<VexflowStaffConfig> = {
    measureWidth: 288,
    staveHeight: 180,
    spacingBetweenLinesPx: 20,
    staveStyle: {
      style: {
        lineWidth: 3,
        strokeStyle: '#dadada',
      },
      leftBar: {
        width: 3,
        style: {
          fillStyle: '#dadada',
        },
      },
      rightBar: {
        width: 3,
        style: {
          fillStyle: '#dadada',
        },
      },
    },
    clef: {
      type: 'treble',
      width: 120,
      options: {
        style: {
          fillStyle: '#afafaf',
        },
      },
      staveOverrides: {
        stillCursor: true,
      },
    },
    renderer: {
      width: 30000,
      height: 180,
      backend: VexFlow.Renderer.Backends.SVG,
    },
    metrics: {
      stemWidth: 3,
      stemHeight: 70,
      metrics: {
        fontSize: 60,
        Stave: {
          padding: 3,
        },
      },
    },
  };

  const staffConfig = resolveStaffConfig(staffOverrides);

  class MovingStaff extends MovableElement {
    private config: ResolvedVexflowStaffConfig;
    private metricsDisposer: () => void;
    private clefElement: HTMLDivElement;
    private notesElement: HTMLDivElement;
    private clefRenderer: Renderer | null = null;
    renderer!: Renderer;
    context!: ReturnType<Renderer['getContext']>;
    staveX = 0;
    notes: StemmableNote[] = [];

    constructor(
      clefElement: HTMLElement,
      notesElement: HTMLElement,
      maxOffsetX: number,
      config: ResolvedVexflowStaffConfig,
    ) {
      super(maxOffsetX);
      this.config = config;
      this.metricsDisposer = applyVexflowMetrics(config.metrics);
      this.clefElement = clefElement as HTMLDivElement;
      this.notesElement = notesElement as HTMLDivElement;

      this.drawClef();
      this.prepareForRedraw();
    }

    private drawClef() {
      this.clefElement.innerHTML = '';
      this.clefRenderer = new VexFlow.Renderer(this.clefElement, this.config.renderer.backend);
      this.clefRenderer.resize(this.config.clef.width, this.config.staveHeight);
      const clefStave = new Stave(0, 0, this.config.clef.width, this.config.clef.staveOverrides);
      clefStave.addClef(this.config.clef.type, this.config.clef.options);
      clefStave.setContext(this.clefRenderer.getContext()).draw();
    }

    prepareForRedraw() {
      this.notesElement.innerHTML = '';
      this.renderer = new VexFlow.Renderer(this.notesElement, this.config.renderer.backend);
      this.renderer.resize(this.config.renderer.width, this.config.staveHeight);
      this.context = this.renderer.getContext();
      this.staveX = 0;
      this.notes = [];
    }

    dispose() {
      this.metricsDisposer?.();
    }

    addMeasure(notes: StaveNoteStruct[]) {
      const measureStave = new Stave(
        this.staveX,
        0,
        this.config.measureWidth,
        this.config.staveStyle,
      );
      this.staveX += this.config.measureWidth;
      measureStave.setContext(this.context).draw();

      const staveNotes = notes.map((note) => {
        const staveNote = new VexFlow.StaveNote(note);
        if (note.duration.includes('d')) {
          const dot = new VexFlow.Dot();
          staveNote.addModifier(dot, 0);
        }
        this.notes.push(staveNote);
        return staveNote;
      });

      if (staveNotes.length > 0) {
        VexFlow.Formatter.FormatAndDraw(this.context, measureStave, staveNotes);
      }
    }
  }

  const maxOffsetX = data.song.measures.length * staffConfig.measureWidth;
  let movingStaff = $state<MovingStaff | null>(null);

  function renderSong() {
    if (!BindingDom.fixedClef || !BindingDom.notesContainer) return;
    if (!movingStaff) {
      movingStaff = new MovingStaff(
        BindingDom.fixedClef,
        BindingDom.notesContainer,
        maxOffsetX,
        staffConfig,
      );
    }

    movingStaff?.prepareForRedraw();

    data.song.measures.forEach((measure) => {
      movingStaff?.addMeasure(measure.notes);
    });
  }

  onMount(() => {
    Metrics.clear();
    renderSong();
  });

  onDestroy(() => {
    movingStaff?.dispose();
    movingStaff = null;
  });
</script>

<Button variant="link" href="/layout">layout</Button>

<svelte:document
  onkeydown={(e) => {
    if (e.key == 'r') movingStaff?.reset();
  }}
/>

{#if vexflowError}
  <div class="error">
    <p>VexFlow Error: {vexflowError}</p>
  </div>
{/if}

<!-- 1015=285*3+120+40 -->
<div id="moving-staff" class="w-[1015px] mx-auto">
  <div bind:this={BindingDom.fixedClef}></div>
  <div id="notes-viewport">
    <div
      id="notes-container"
      bind:this={BindingDom.notesContainer}
      {@attach movingStaff?.draggable()}
    ></div>
  </div>
</div>

<Button id="renderButton" onclick={renderSong}>rerender</Button>
<Button id="pauseButton" onclick={movingStaff?.stop}>pause</Button>
<Button id="resumeButton" onclick={movingStaff?.move}>resume</Button>
<Button id="resetButton" onclick={movingStaff?.reset}>reset</Button>

<style>
  #moving-staff {
    display: flex;
    justify-content: center;
    flex-direction: row;
    position: relative;
    z-index: 2;
  }

  #notes-viewport {
    width: 100%;
    overflow: hidden;
    cursor: grab;
    user-select: none;
    /* the distance being visible from the left of the still cursor line */
    margin-left: -40px;
  }

  #notes-container {
    /* the distance we need offset to keep whole notes area visible */
    /* the above 40px - 5px(the width of the still cursor line) */
    padding-left: 35px;
  }
</style>
