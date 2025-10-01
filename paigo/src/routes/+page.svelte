<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DebugGrid,
    RenderContext,
    SVGContext,
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
    staveHeight: 200,
    // baseline minimum width for the fixed stave (dynamic width calculated per key signature)
    fixedStaveMinWidth: 60,
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
      // each stave has a beginning barline
      leftBar: {
        width: 4,
        style: {
          fillStyle: '#dadada',
        },
      },
      // each stave does not have a ending barline excluding the last one
      rightBar: false,
      // distance bewteen the right edge of a barline and the left edge of a note
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

  class MovingStaff extends MovableElement {
    private config: ConfigInstance;
    private fixedElement: HTMLDivElement;
    private notesElement: HTMLDivElement;
    renderer!: Renderer;
    context!: RenderContext;
    staveX = 0;
    notes: StaveNote[] = [];
    staves: Stave[] = [];
    private noteSpanAllVisible = false;
    private tempo: number = 60;
    private beatsPerMeasure: number = 4;
    private pixelsPerBeat: number = layout.measureWidth / 4;
    private cursorAnchorX: number | null = null;
    private cursorElement: SVGGElement | null = null;

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

      this.onMove = (offsetX) => this.syncCursorPosition(offsetX);
    }

    private drawFixedStave() {
      this.fixedElement.innerHTML = '';
      const renderer = new VexFlow.Renderer(
        this.config,
        this.fixedElement,
        VexFlow.Renderer.Backends.SVG,
      );
      const fixedWidth = this.computeFixedStaveWidth();
      renderer.resize(fixedWidth, layout.staveHeight);
      const fixedStave = new Stave(this.config, 0, 0, fixedWidth, {});
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
      this.cursorAnchorX = null;
      this.cursorElement = null;
    }

    addMeasure(timeSignature: string, notes: StaveNoteStruct[], last: boolean = false) {
      let config = this.config;
      if (this.staves.length == 0) {
        config = this.config.fork({
          Stave: {
            paddingLeft: 32,
            leftBar: false,
          },
        });
      }
      const measureStave = new Stave(config, this.staveX, 0, layout.measureWidth);
      this.staves.push(measureStave);
      this.staveX += layout.measureWidth;
      if (this.staves.length == 1) {
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

        if (this.staves.length == 1) {
          this.drawCursorAt(this.notes[0].getAbsoluteX());
        }
      }

      // add more staves to fill the screen
      if (last) {
        const extras = 3;
        for (let i = 0; i < extras - 1; i++) {
          new Stave(config, this.staveX, 0, layout.measureWidth).setContext(this.context).draw();
          this.staveX += layout.measureWidth;
        }
        new Stave(config, this.staveX, 0, layout.measureWidth, {
          rightBar: this.config.get('Stave.leftBar'),
        })
          .setContext(this.context)
          .draw();
        this.staveX += layout.measureWidth;
      }
    }

    drawCursorAt(x: number) {
      if (this.staves.length == 0) return;
      this.cursorAnchorX = x;
      const element = this.ensureCursorElement();
      if (!element) return;
      this.syncCursorPosition();
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

    private getSvgContext(): SVGContext | null {
      return this.context instanceof SVGContext ? (this.context as SVGContext) : null;
    }

    private computeFixedStaveWidth(): number {
      const scratch = new Stave(this.config, 0, 0, 0, {
        leftBar: {
          width: 4,
        },
      });
      scratch.addClef('treble');
      if (data.song.keySignature) {
        scratch.addKeySignature(data.song.keySignature);
      }
      const noteStartX = scratch.getNoteStartX();
      const paddingRight = this.config.get('Stave.paddingRight', 0);
      const endPadding = this.config.get('Stave.endPaddingMax', 0);
      const paddingLeft = this.config.get('Stave.paddingLeft', 0);
      const computed = noteStartX + paddingRight + endPadding + paddingLeft;
      const minWidth = layout.fixedStaveMinWidth;
      return Math.max(Math.ceil(computed), minWidth);
    }

    private ensureCursorElement(): SVGGElement | null {
      if (this.cursorElement) return this.cursorElement;
      const svgContext = this.getSvgContext();
      if (!svgContext) return null;

      const width = this.config.get('Stem.width');
      const height = this.context.height;
      this.cursorElement = svgContext.openGroup('cursor');
      svgContext.fillRect(0, 0, width, height, {
        rx: width / 2,
        ry: width / 2,
        opacity: 0.8,
        fill: '#e0e0e0',
        'pointer-events': 'none',
      });
      svgContext.closeGroup();
      return this.cursorElement;
    }

    // sync cursor poosition so that it has a fixed position where the first
    // note is located
    private syncCursorPosition(offsetX: number = this.currentOffsetX) {
      if (this.cursorAnchorX === null) return;
      const cursor = this.ensureCursorElement();
      if (!cursor) return;

      cursor.setAttribute('transform', `translate(${this.cursorAnchorX + offsetX}, 0)`);
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

    data.song.measures.forEach((measure, index) => {
      movingStaff?.addMeasure(
        data.song.timeSignature,
        measure.notes,
        index + 1 == data.song.measures.length,
      );
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
<div id="moving-staff" class="w-[1016px] mx-auto mt-6 mb-10 p-8">
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
