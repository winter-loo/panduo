<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DebugGrid,
    RenderContext,
    Renderer,
    Stave,
    StaveNote,
    VexFlow,
    type DebugGridOptions,
    type StaveNoteStruct,
  } from '$lib/vexflow/vexflow-core';
  import type { PageProps } from './$types';
  import { MovableElement } from '$lib/movable';
  import { Button } from '$lib/components/ui/button/index';
  import GridOverlayControl from '$lib/components/debug/GridOverlayControl.svelte';
  import TempoSlider from '$lib/components/ui/TempoSlider.svelte';

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
    // including clef width and key signature width and paddings
    // TODO: calculate dynamically this width as key signature width changes
    fixedStaveWidth: 150,
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
      width: 6,
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
    TimeSignature: {
      fillStyle: '#afafaf',
    },
    KeySignature: {
      fillStyle: '#afafaf',
    },
  });

  class MovingStaff extends MovableElement {
    private config: ConfigInstance;
    private fixedElement: HTMLDivElement;
    private notesElement: HTMLDivElement;
    renderer!: Renderer;
    context!: RenderContext;
    staveX = 0;
    notes: StaveNote[] = [];
    private noteSpanAllVisible = false;
    private tempo: number = 60;
    private beatsPerMeasure: number = 4;
    private pixelsPerBeat: number = layout.measureWidth / 4;

    private readonly handleNoteClick = (note: StaveNote) => {
      const hasVisibleSpan = note.noteSpans.some((span) => span.isVisible());
      if (hasVisibleSpan) {
        note.hideNoteSpan();
      } else {
        note.showNoteSpan();
      }
    };

    constructor(
      fixedElement: HTMLElement,
      notesElement: HTMLElement,
      maxOffsetX: number,
      config: ConfigInstance,
      tempo: number,
      timeSignature: string,
    ) {
      super(maxOffsetX);
      this.config = config;
      this.fixedElement = fixedElement as HTMLDivElement;
      this.notesElement = notesElement as HTMLDivElement;
      this.setTiming(tempo, timeSignature);
      this.getPixelsPerSecond = () => this.computePixelsPerSecond();

      this.drawFixedStave();
      this.prepareForRedraw();
    }

    private drawFixedStave() {
      this.fixedElement.innerHTML = '';
      let renderer = new VexFlow.Renderer(
        this.config,
        this.fixedElement,
        VexFlow.Renderer.Backends.SVG,
      );
      renderer.resize(layout.fixedStaveWidth, layout.staveHeight);
      const fixedStave = new Stave(this.config, 0, 0, layout.fixedStaveWidth, {
        stillCursor: false,
        leftBar: {
          width: 4,
          style: {
            fillStyle: '#dadada',
          },
        },
      });
      fixedStave.addClef('treble');
      if (data.song.keySignature) {
        fixedStave.addKeySignature(data.song.keySignature);
      }
      fixedStave.setContext(renderer.getContext()).draw();
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
      let config = this.config;
      if (this.notes.length == 0) {
        config = this.config.fork({
          Stave: {
            paddingLeft: 48,
          },
        });
      }
      const measureStave = new Stave(config, this.staveX, 0, layout.measureWidth);
      this.staveX += layout.measureWidth;
      if (this.notes.length == 0) {
        measureStave.addTimeSignature('4/4');
      }
      measureStave.setContext(this.context).draw();

      const staveNotes = notes.map((note) => {
        const staveNote = new VexFlow.StaveNote(config, { ...note, autoStem: true });
        if (this.noteSpanAllVisible) {
          staveNote.showNoteSpan();
        } else {
          staveNote.hideNoteSpan();
        }
        if (note.duration.includes('d')) {
          const dot = new VexFlow.Dot(config);
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
          config,
          {
            autoBeam: true,
          },
        );
        this.registerNoteInteractions(staveNotes);
      }
    }

    setNoteSpanVisible(visible: boolean) {
      this.noteSpanAllVisible = visible;
      this.notes.forEach((note) => {
        if (visible) {
          note.showNoteSpan();
        } else {
          note.hideNoteSpan();
        }
      });
    }

    setTiming(tempo: number, timeSignature: string) {
      this.tempo = tempo > 0 ? tempo : 60;
      this.beatsPerMeasure = this.parseBeatsPerMeasure(timeSignature);
      this.pixelsPerBeat = layout.measureWidth / this.beatsPerMeasure;
      this.config.setTempo(this.tempo);
    }

    getTempo(): number {
      return this.tempo;
    }

    private parseBeatsPerMeasure(timeSig: string): number {
      const [beats] = timeSig.split('/');
      const parsed = Number.parseInt(beats ?? '4', 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
    }

    private computePixelsPerSecond(): number {
      if (this.tempo <= 0) return 0;
      const beatsPerSecond = this.tempo / 60;
      return this.pixelsPerBeat * beatsPerSecond;
    }

    private registerNoteInteractions(notes: StaveNote[]) {
      notes.forEach((note) => {
        const group = note.getSVGElement() as SVGGElement | null;
        if (!group) return;
        group.classList.add('notespan-click-target');
        group.addEventListener('click', () => this.handleNoteClick(note));
      });
    }
  }

  const maxOffsetX = data.song.measures.length * layout.measureWidth;
  let movingStaff = $state<MovingStaff | null>(null);

  let noteSpanVisible = $state(false);
  let tempo = $state(data.song.tempo ?? 60);

  function renderSong() {
    if (!BindingDom.fixedClef || !BindingDom.notesContainer) return;
    if (!movingStaff) {
      movingStaff = new MovingStaff(
        BindingDom.fixedClef,
        BindingDom.notesContainer,
        maxOffsetX,
        configInstance,
        tempo,
        data.song.timeSignature,
      );
    } else {
      movingStaff.setTiming(tempo, data.song.timeSignature);
    }

    movingStaff.prepareForRedraw();
    movingStaff.setNoteSpanVisible(noteSpanVisible);
    tempo = movingStaff.getTempo();

    data.song.measures.forEach((measure) => {
      movingStaff?.addMeasure(data.song.timeSignature, measure.notes);
    });
  }

  function toggleNoteSpan() {
    noteSpanVisible = !noteSpanVisible;
    movingStaff?.setNoteSpanVisible(noteSpanVisible);
  }

  $effect(() => {
    if (!movingStaff) return;
    movingStaff.setTiming(tempo, data.song.timeSignature);
  });

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
  <Button type="button" onclick={toggleNoteSpan}>
    {noteSpanVisible ? 'hide span' : 'show span'}
  </Button>
</div>

<div class="bg-[#f3f3f3] ml-2 w-42 h-16 flex items-center justify-center rounded-xl">
  <TempoSlider bind:value={tempo} min={40} max={200} step={5} />
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
  }

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
