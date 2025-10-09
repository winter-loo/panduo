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
    Voice,
    Formatter,
    VoiceMode,
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

  const parts = data.song.timeSignature.split('/');
  configInstance.setBeatsInMeasure(parseInt(parts[0]));
  configInstance.setBeatUnit(parseInt(parts[1]));

  layout.measureWidth =
    (configInstance.get('quarterNoteWidth') * configInstance.get('beatsInMeasure') * 4) /
    configInstance.get('beatUnit');

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
    private pixelsPerBeat: number = 112;
    private cursorAnchorX: number | null = null;
    private cursorElement: SVGGElement | null = null;
    private currentNoteIndex = 0;
    private highlightedNoteIndex: number | null = null;
    private scalePulseNoteIndex: number | null = null;
    private pendingNoteIndex: number | null = null;
    private showingNoteSpanFromHold = false;
    private lastAdvanceTimestamp = 0;
    private lastRecordedOffset = 0;

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

      this.onMove = (offsetX) => {
        this.syncCursorPosition(offsetX);
        this.resetColorsWhenOffsetDecreases(offsetX);
      };
      this.onDragStart = () => this.handleDragStart();
      this.onDragEnd = () => this.snapToNearestPreviousNote();
    }

    protected override onReset(): void {
      super.onReset();
      this.clearHighlightedNoteSpan();
      this.applyScalePulseToNote(null);
      this.showingNoteSpanFromHold = false;
      this.currentNoteIndex = 0;
      this.pendingNoteIndex = null;
      this.lastAdvanceTimestamp = 0;
      const firstNoteX = this.notes[0]?.getAbsoluteX() ?? null;
      const anchorChanged = this.cursorAnchorX !== firstNoteX;
      this.cursorAnchorX = firstNoteX;
      if (anchorChanged) {
        this.syncCursorPosition();
      }
      this.lastRecordedOffset = this.currentOffsetX;
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
      if (this.scalePulseNoteIndex !== null) {
        const active = this.notes[this.scalePulseNoteIndex];
        active?.setScalePulseState(false);
        if (active) this.resetNoteColor(active);
      }
      this.notes.forEach((note) => {
        note.noteSpans.forEach((span) => span.resetOuterMode());
        this.resetNoteColor(note);
      });
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
      this.currentNoteIndex = 0;
      this.highlightedNoteIndex = null;
      this.scalePulseNoteIndex = null;
      this.pendingNoteIndex = null;
      this.showingNoteSpanFromHold = false;
      this.lastAdvanceTimestamp = 0;
      this.lastRecordedOffset = this.currentOffsetX;
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
      let measureWidth = layout.measureWidth;
      if (this.staves.length === 0 && timeSignature) {
        measureWidth += this.computeTimeSignatureExtraWidth(config.fork(), timeSignature);
      }
      const measureStave = new Stave(config, this.staveX, 0, measureWidth);
      this.staves.push(measureStave);
      this.staveX += measureWidth;
      if (this.staves.length == 1 && timeSignature) {
        measureStave.addTimeSignature(timeSignature);
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
          let stave = new Stave(config, this.staveX, 0, layout.measureWidth);
          stave.setContext(this.context).draw();
          if (i == 0) {
            // add an invisble note
            let xNote = new StaveNote(config, { keys: ['b/4'], duration: '8' });
            this.notes.push(xNote);
            let voice = new Voice(config, timeSignature)
              .setMode(VoiceMode.SOFT)
              .addTickables([xNote]);
            new Formatter(config).formatToStave([voice], stave);
          }
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
      if (!visible && this.highlightedNoteIndex !== null) {
        this.notes[this.highlightedNoteIndex]?.showNoteSpan();
      }
    }

    setTiming(tempo: number, timeSignature: string) {
      this.tempo = tempo > 0 ? tempo : 60;
      this.beatsPerMeasure = this.parseBeatsPerMeasure(timeSignature);
      this.pixelsPerBeat = layout.measureWidth / this.beatsPerMeasure;
      this.config.setTempo(this.tempo);
      const pixelsPerSecond = this.computePixelsPerSecond();
      this.config.setTempoSpeed(pixelsPerSecond / 1000);
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

    private handleDragStart() {
      // Cancel automated animations so the drag fully controls the staff position.
      this.stop();
      this.lastRecordedOffset = this.currentOffsetX;
    }

    private resetColorsWhenOffsetDecreases(offsetX: number) {
      const tolerance = 0.05;
      if (offsetX <= this.lastRecordedOffset - tolerance) {
        this.resetNotesRightOfOffset(offsetX);
      }
      this.lastRecordedOffset = offsetX;
    }

    private snapToNearestPreviousNote() {
      if (this.notes.length === 0) return;
      const anchorX = this.getCursorAnchor();
      if (anchorX === null) return;

      const current = this.currentOffsetX;
      const tolerance = 0.5;
      let bestIndex = 0;
      let bestOffset = 0;

      // Snap to the last note whose leading edge is at or before the current offset.
      this.notes.forEach((note, index) => {
        const absoluteX = note.getAbsoluteX();
        if (!Number.isFinite(absoluteX)) return;
        const relative = absoluteX - anchorX;
        const clamped = Math.max(0, Math.min(this.maxOffsetX, relative));
        if (clamped <= current + tolerance && clamped >= bestOffset) {
          bestOffset = clamped;
          bestIndex = index;
        }
      });

      this.currentNoteIndex = bestIndex;
      this.pendingNoteIndex = null;
      const snappedNote = this.notes[bestIndex] ?? null;
      const delta = bestOffset - current;

      if (Math.abs(delta) <= tolerance) {
        if (snappedNote) this.resetNoteColor(snappedNote);
        return;
      }

      this.moveTo(bestOffset, 160, {
        onComplete: () => {
          if (snappedNote) this.resetNoteColor(snappedNote);
        },
      });
    }

    private resetNotesRightOfOffset(offsetX: number) {
      if (this.notes.length === 0) return;
      const anchorX = this.getCursorAnchor();
      if (anchorX === null) return;

      const tolerance = 0.05;
      // Any note at or right of the cursor line should return to default color.
      this.notes.forEach((note, index) => {
        const absoluteX = note.getAbsoluteX();
        if (!Number.isFinite(absoluteX)) return;
        const relative = absoluteX - anchorX;
        const clamped = Math.max(0, Math.min(this.maxOffsetX, relative));
        if (clamped + tolerance >= offsetX) {
          this.resetNoteColor(note);
          if (!this.noteSpanAllVisible && this.highlightedNoteIndex === index) {
            this.setNoteSpanVisibility(index, false);
            this.highlightedNoteIndex = null;
          }
        }
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

    private computeTimeSignatureExtraWidth(config: ConfigInstance, timeSignature: string): number {
      if (!timeSignature) return 0;
      const baseStave = new Stave(config, 0, 0, 1000);
      const baseStart = baseStave.getNoteStartX();
      const withTimeSignature = new Stave(config, 0, 0, 1000);
      withTimeSignature.addTimeSignature(timeSignature);
      const timeSignatureStart = withTimeSignature.getNoteStartX();
      const extra =
        timeSignatureStart -
        baseStart +
        config.get('Stave.paddingLeft') -
        config.get('Stave.style.lineWidth') * 2;
      return Number.isFinite(extra) && extra > 0 ? extra : 0;
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

    private getCursorAnchor(): number | null {
      if (this.cursorAnchorX !== null) return this.cursorAnchorX;
      if (this.notes.length === 0) return null;
      return this.notes[0].getAbsoluteX();
    }

    private clearHighlightedNoteSpan() {
      if (this.highlightedNoteIndex !== null && !this.noteSpanAllVisible) {
        this.setNoteSpanVisibility(this.highlightedNoteIndex, false);
      }
      this.highlightedNoteIndex = null;
    }

    private showNoteSpanFor(index: number) {
      if (index < 0 || index >= this.notes.length) return;
      if (this.noteSpanAllVisible) {
        this.highlightedNoteIndex = index;
        return;
      }
      if (this.highlightedNoteIndex !== null && this.highlightedNoteIndex !== index) {
        this.setNoteSpanVisibility(this.highlightedNoteIndex, false);
      }
      this.setNoteSpanVisibility(index, true);
      this.highlightedNoteIndex = index;
    }

    private findNextNonRestIndex(fromIndex: number): number | null {
      if (this.notes.length === 0) return null;
      for (let i = fromIndex + 1; i < this.notes.length; i++) {
        const note = this.notes[i];
        if (!note) continue;
        if (typeof note.isRest === 'function' && note.isRest()) continue;
        return i;
      }
      return null;
    }

    private setNoteSpanVisibility(index: number, visible: boolean) {
      const note = this.notes[index];
      if (!note) return;
      if (visible) {
        note.showNoteSpan();
      } else {
        note.hideNoteSpan();
      }
      const group = note.getSVGElement() as SVGGElement | null;
      const spanGroup = group?.querySelector('g.vf-notespan') as SVGGElement | null;
      if (!spanGroup) return;
      if (visible) {
        spanGroup.removeAttribute('display');
        spanGroup.removeAttribute('aria-hidden');
      } else {
        spanGroup.setAttribute('display', 'none');
        spanGroup.setAttribute('aria-hidden', 'true');
      }
    }

    startNoteSpanPreview() {
      if (this.notes.length === 0) return;
      this.showingNoteSpanFromHold = true;
      this.showNoteSpanFor(this.currentNoteIndex);
    }

    stopNoteSpanPreview() {
      if (!this.showingNoteSpanFromHold) return;
      this.showingNoteSpanFromHold = false;
      this.clearHighlightedNoteSpan();
    }

    private scrollToNote(index: number, options: { immediate?: boolean; easing?: boolean } = {}) {
      if (index < 0 || index >= this.notes.length) return;
      const { immediate = false, easing = true } = options;
      const anchorX = this.getCursorAnchor();
      if (anchorX === null) return;
      const noteX = this.notes[index].getAbsoluteX();
      const targetOffset = Math.max(0, Math.min(this.maxOffsetX, noteX - anchorX));
      const distance = Math.abs(targetOffset - this.currentOffsetX);

      if (immediate) {
        this.stop();
        this.adjustByAnimated(targetOffset - this.currentOffsetX);
        return;
      }

      if (distance < 0.5) {
        this.adjustBy(targetOffset - this.currentOffsetX);
        return;
      }

      const pixelsPerSecond = this.getPixelsPerSecond ? this.getPixelsPerSecond() : 60;
      if (!Number.isFinite(pixelsPerSecond) || pixelsPerSecond <= 0) {
        this.adjustByAnimated(targetOffset - this.currentOffsetX);
        return;
      }

      const duration = Math.max(16, (distance / pixelsPerSecond) * 1000);
      this.moveTo(targetOffset, duration, easing);
    }

    goToNextNote() {
      if (this.notes.length === 0) return;

      const originIndex = this.currentNoteIndex;
      const originNote = this.notes[originIndex];
      if (originNote) {
        this.applyNoteColor(originNote, this.getNoteColorVar(originNote));
        this.showNoteSpanFor(originIndex);
      }

      const nextIndex = this.findNextNonRestIndex(originIndex);
      if (nextIndex === null) return;

      const now = performance.now();
      const immediate = this.moveAnimationId !== null || now - this.lastAdvanceTimestamp < 200;
      this.lastAdvanceTimestamp = now;
      this.scrollToNote(nextIndex, { immediate, easing: false });
      this.pendingNoteIndex = nextIndex;
    }

    startScalePulseAnimation(): StaveNote | null {
      if (this.notes.length === 0) {
        this.applyScalePulseToNote(null);
        return null;
      }
      if (this.currentNoteIndex < 0 || this.currentNoteIndex >= this.notes.length) {
        this.applyScalePulseToNote(null);
        return null;
      }
      const note = this.applyScalePulseToNote(this.currentNoteIndex);
      if (this.pendingNoteIndex !== null) {
        this.currentNoteIndex = this.pendingNoteIndex;
        this.pendingNoteIndex = null;
      }
      return note;
    }

    private applyScalePulseToNote(index: number | null): StaveNote | null {
      if (this.scalePulseNoteIndex !== null) {
        const note = this.notes[this.scalePulseNoteIndex];
        if (note) {
          note.setScalePulseState(false);
          note.noteSpans.forEach((span) => span.resetOuterMode());
        }
      }

      this.scalePulseNoteIndex = null;

      if (index === null) return null;

      if (index < 0 || index >= this.notes.length) {
        return null;
      }

      const note = this.notes[index];
      if (!note) return null;

      note.setScalePulseState(true);
      note.noteSpans.forEach((span) => span.resetOuterMode());
      this.scalePulseNoteIndex = index;
      return note;
    }

    private getNoteColorVar(note: StaveNote): string {
      const primary = note.getPrimaryNoteName();
      const letter = typeof primary === 'string' ? primary.charAt(0).toLowerCase() : '';
      const validLetters = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      return validLetters.has(letter) ? `--note-${letter}` : '--note-default';
    }

    private applyNoteColor(note: StaveNote, cssVar: string): void {
      const group = note.getSVGElement() as SVGGElement | null;
      if (!group) return;
      group.style.setProperty('color', `var(${cssVar})`);
    }

    private resetNoteColor(note: StaveNote): void {
      this.applyNoteColor(note, '--note-default');
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

  const NOTE_SCALE_DURATION = 200;
  const NOTESPAN_EXPAND_DELAY = 60;
  const NOTESPAN_HOLD_DURATION = 200;

  let pointerHoldActive = false;
  let skipNextClick = false;

  function runNextNoteReleaseAnimation() {
    const note = movingStaff?.startScalePulseAnimation();
    if (!note) {
      movingStaff?.stopNoteSpanPreview();
      return;
    }

    note.noteSpans.forEach((span) => {
      span.startHaloPulseAnimation(NOTESPAN_EXPAND_DELAY, NOTESPAN_HOLD_DURATION);
    });

    if (typeof window === 'undefined') {
      note.setScalePulseState(false);
      movingStaff?.stopNoteSpanPreview();
      return;
    }

    window.setTimeout(() => note.setScalePulseState(false), NOTE_SCALE_DURATION);
    window.setTimeout(
      () => movingStaff?.stopNoteSpanPreview(),
      NOTESPAN_EXPAND_DELAY + NOTESPAN_HOLD_DURATION,
    );
  }

  function handleNextNotePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    pointerHoldActive = true;
    skipNextClick = true;
    movingStaff?.startNoteSpanPreview();
    movingStaff?.goToNextNote();
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
    movingStaff?.stopNoteSpanPreview();
  }

  function handleNextNoteClick() {
    if (skipNextClick) {
      skipNextClick = false;
      return;
    }
    movingStaff?.goToNextNote();
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
