<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DebugGrid,
    RenderContext,
    Renderer,
    Stave,
    StemmableNote,
    VexFlow,
    type DebugGridOptions,
    type StaveNoteStruct,
  } from '$lib/vexflow/vexflow-core';
  import type { PageProps } from './$types';
  import { MovableElement } from '$lib/movable';
  import { Button } from '$lib/components/ui/button/index';
  import GridOverlayControl from '$lib/components/debug/GridOverlayControl.svelte';

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

  const layout = {
    measureWidth: 448,
    staveHeight: 180,
    clefWidth: 120,
    rendererWidth: 30000,
    spacingBetweenLinesPx: 20,
    numLines: 5,
  };

  const derivedPadding = Math.max(
    0,
    Math.floor(
      (layout.staveHeight - layout.spacingBetweenLinesPx * (layout.numLines - 1)) /
        (2 * layout.spacingBetweenLinesPx),
    ),
  );

  type ConfigInstance = ReturnType<typeof VexFlow.Config.defaults>;

  const configInstance = VexFlow.Config.create({
    fontSize: 60,
    Stem: {
      width: 4,
      height: 70,
      lineWidth: 4,
    },
    NoteHead: {
      pointerRect: false,
    },
    Stave: {
      spacingBetweenLinesPx: layout.spacingBetweenLinesPx,
      spaceAboveStaffLn: derivedPadding,
      spaceBelowStaffLn: derivedPadding,
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
      paddingLeft: 8, // 4 + 4
    },
    Clef: {
      defaults: {
        style: {
          fillStyle: '#afafaf',
        },
      },
      types: {},
    },
  });

  class MovingStaff extends MovableElement {
    private config: ConfigInstance;
    private clefElement: HTMLDivElement;
    private notesElement: HTMLDivElement;
    private clefRenderer: Renderer | null = null;
    renderer!: Renderer;
    context!: RenderContext;
    staveX = 0;
    notes: StemmableNote[] = [];

    constructor(
      clefElement: HTMLElement,
      notesElement: HTMLElement,
      maxOffsetX: number,
      config: ConfigInstance,
    ) {
      super(maxOffsetX);
      this.config = config;
      this.clefElement = clefElement as HTMLDivElement;
      this.notesElement = notesElement as HTMLDivElement;

      // this.drawClef();
      this.prepareForRedraw();
    }

    private drawClef() {
      this.clefElement.innerHTML = '';
      this.clefRenderer = new VexFlow.Renderer(
        this.config,
        this.clefElement,
        VexFlow.Renderer.Backends.SVG,
      );
      this.clefRenderer.resize(layout.clefWidth, layout.staveHeight);
      const clefStave = new Stave(0, 0, layout.clefWidth, this.config, {
        stillCursor: false,
      });
      clefStave.addClef('treble');
      clefStave.setContext(this.clefRenderer.getContext()).draw();
    }

    prepareForRedraw() {
      this.notesElement.innerHTML = '';
      this.renderer = new VexFlow.Renderer(
        this.config,
        this.notesElement,
        VexFlow.Renderer.Backends.SVG,
      );
      this.renderer.resize(layout.rendererWidth, layout.staveHeight);
      this.context = this.renderer.getContext();
      this.staveX = 0;
      this.notes = [];
    }

    addMeasure(timeSignature: string, notes: StaveNoteStruct[]) {
      const measureStave = new Stave(this.staveX, 0, layout.measureWidth, this.config);
      this.staveX += layout.measureWidth;
      measureStave.setContext(this.context).draw();

      const staveNotes = notes.map((note) => {
        const staveNote = new VexFlow.StaveNote(this.config, { ...note, autoStem: true });
        if (note.duration.includes('d')) {
          const dot = new VexFlow.Dot(this.config);
          staveNote.addModifier(dot, 0);
        }
        this.notes.push(staveNote);
        return staveNote;
      });

      if (staveNotes.length > 0) {
        VexFlow.Formatter.FormatAndDraw(
          this.context,
          measureStave,
          { timeSignature, notes: staveNotes },
          this.config,
          {
            autoBeam: true,
          },
        );
      }
    }
  }

  const maxOffsetX = data.song.measures.length * layout.measureWidth;
  let movingStaff = $state<MovingStaff | null>(null);

  function renderSong() {
    if (!BindingDom.fixedClef || !BindingDom.notesContainer) return;
    if (!movingStaff) {
      movingStaff = new MovingStaff(
        BindingDom.fixedClef,
        BindingDom.notesContainer,
        maxOffsetX,
        configInstance,
      );
    }

    movingStaff.prepareForRedraw();

    data.song.measures.forEach((measure) => {
      movingStaff?.addMeasure(data.song.timeSignature, measure.notes);
    });
  }

  let debugGridEnabled = $state(false);
  let debugGrid: DebugGrid;
  const gridBaseOptions: DebugGridOptions = {
    spacing: layout.spacingBetweenLinesPx,
    majorSpacing: layout.spacingBetweenLinesPx * 4,
    includeOriginLabels: true,
    showLabels: true,
  };
  let gridOptions = $state<DebugGridOptions>({ ...gridBaseOptions });

  const createDebugGrid = (context: RenderContext) => {
    debugGrid = new VexFlow.DebugGrid(context, {
      ...gridBaseOptions,
      ...gridOptions,
    });
  };
  const redrawDebugGrid = () => {
    if (!movingStaff) return;
    if (!debugGrid) {
      createDebugGrid(movingStaff.context);
    } else {
      debugGrid.clear();
    }
    if (debugGridEnabled) {
      debugGrid?.draw();
    }
  };

  onMount(() => {
    renderSong();
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

<!-- 1016=448*2+120 -->
<div id="moving-staff" class="w-[1016px] mx-auto">
  <div bind:this={BindingDom.fixedClef}></div>
  <div id="notes-viewport">
    <div
      id="notes-container"
      bind:this={BindingDom.notesContainer}
      {@attach movingStaff?.draggable()}
    ></div>
  </div>
</div>

<div class="controls-row">
  <GridOverlayControl
    bind:enabled={debugGridEnabled}
    options={gridOptions}
    baseOptions={gridBaseOptions}
    onToggle={redrawDebugGrid}
    onOptionsChange={redrawDebugGrid}
  />
  <Button id="renderButton" type="button" onclick={renderSong}>rerender</Button>
  <Button id="pauseButton" type="button" onclick={movingStaff?.stop}>pause</Button>
  <Button id="resumeButton" type="button" onclick={movingStaff?.move}>resume</Button>
  <Button id="resetButton" type="button" onclick={movingStaff?.reset}>reset</Button>
</div>

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

  .controls-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1rem;
    align-items: center;
  }
</style>
