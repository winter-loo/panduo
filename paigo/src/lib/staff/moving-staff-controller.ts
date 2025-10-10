import {
  RenderContext,
  Renderer,
  Stave,
  StaveNote,
  VexFlow,
  Voice,
  Formatter,
  VoiceMode,
  SVGContext,
  type StaveNoteStruct,
} from '$lib/vexflow/vexflow-core';
import { MovableElement } from '$lib/movable';

export interface StaffLayout {
  measureWidth: number;
  staveHeight: number;
  fixedStaveMinWidth: number;
  rendererWidth: number;
  spacingBetweenLinesPx: number;
  numLines: number;
}

export const BASE_LAYOUT: StaffLayout = {
  measureWidth: 448,
  staveHeight: 200,
  fixedStaveMinWidth: 60,
  rendererWidth: 30000,
  spacingBetweenLinesPx: 20,
  numLines: 5,
};

export function cloneLayout(overrides: Partial<StaffLayout> = {}): StaffLayout {
  return { ...BASE_LAYOUT, ...overrides };
}

type ConfigInstance = ReturnType<typeof VexFlow.Config.defaults>;

export class MovingStaffController extends MovableElement {
  private layout: StaffLayout;
  private config: ConfigInstance;
  private fixedElement: HTMLDivElement;
  private notesElement: HTMLDivElement;
  renderer!: Renderer;
  context!: RenderContext;
  staveX = 0;
  notes: StaveNote[] = [];
  staves: Stave[] = [];
  private noteSpanAllVisible = false;
  private tempo = 60;
  private beatsPerMeasure = 4;
  private pixelsPerBeat = 112;
  private cursorAnchorX: number | null = null;
  private cursorElement: SVGGElement | null = null;
  private currentNoteIndex = 0;
  private highlightedNoteIndex: number | null = null;
  private scalePulseNoteIndex: number | null = null;
  private pendingNoteIndex: number | null = null;
  private showingNoteSpanFromHold = false;
  private lastAdvanceTimestamp = 0;
  private lastRecordedOffset = 0;
  private keySignature?: string;

  constructor(
    layout: StaffLayout,
    fixedElement: HTMLElement,
    notesElement: HTMLElement,
    maxOffsetX: number,
    config: ConfigInstance,
    tempo: number,
    timeSignature: string,
    keySignature?: string,
  ) {
    super(maxOffsetX);
    this.layout = layout;
    this.config = config;
    this.keySignature = keySignature;
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

  destroy() {
    this.stop();
    this.releaseActiveVisualState();
    this.clearContainer(this.fixedElement);
    this.clearContainer(this.notesElement);
    this.resetControllerState({ dropStaves: true });
  }

  private clearContainer(element: HTMLElement) {
    element.replaceChildren();
  }

  private removeCursorElement() {
    this.cursorElement?.remove();
    this.cursorElement = null;
  }

  private releaseActiveVisualState() {
    this.deactivateScalePulse({ resetColor: true });
    this.notes.forEach((note) => {
      note.noteSpans.forEach((span) => span.resetOuterMode());
      this.resetNoteColor(note);
    });
    this.clearHighlightedNoteSpan();
    this.removeCursorElement();
  }

  private resetControllerState(options: { dropStaves?: boolean } = {}) {
    const { dropStaves = false } = options;
    this.notes = [];
    if (dropStaves) {
      this.staves = [];
    }
    this.staveX = 0;
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

  private drawFixedStave() {
    // this.fixedElement.innerHTML = '';
    const renderer = new VexFlow.Renderer(
      this.config,
      this.fixedElement,
      VexFlow.Renderer.Backends.SVG,
    );
    const fixedWidth = this.computeFixedStaveWidth();
    renderer.resize(fixedWidth, this.layout.staveHeight);
    const fixedStave = new Stave(this.config, 0, 0, fixedWidth, {});
    fixedStave.addClef('treble');
    if (this.keySignature) {
      fixedStave.addKeySignature(this.keySignature);
    }
    fixedStave.setContext(renderer.getContext()).draw();
  }

  prepareForRedraw() {
    this.releaseActiveVisualState();
    this.clearContainer(this.notesElement);
    this.renderer = new VexFlow.Renderer(
      this.config,
      this.notesElement,
      VexFlow.Renderer.Backends.SVG,
    );
    this.renderer.resize(this.layout.rendererWidth, this.layout.staveHeight);
    this.context = this.renderer.getContext();
    this.resetControllerState({ dropStaves: true });
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
    let measureWidth = this.layout.measureWidth;
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

    if (last) {
      const extras = 3;
      for (let i = 0; i < extras - 1; i++) {
        let stave = new Stave(config, this.staveX, 0, this.layout.measureWidth);
        stave.setContext(this.context).draw();
        if (i == 0) {
          let xNote = new StaveNote(config, { keys: ['b/4'], duration: '8' });
          this.notes.push(xNote);
          let voice = new Voice(config, timeSignature)
            .setMode(VoiceMode.SOFT)
            .addTickables([xNote]);
          new Formatter(config).formatToStave([voice], stave);
        }
        this.staveX += this.layout.measureWidth;
      }
      new Stave(config, this.staveX, 0, this.layout.measureWidth, {
        rightBar: this.config.get('Stave.leftBar'),
      })
        .setContext(this.context)
        .draw();
      this.staveX += this.layout.measureWidth;
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
    this.pixelsPerBeat = this.layout.measureWidth / this.beatsPerMeasure;
    this.config.setTempo(this.tempo);
    const pixelsPerSecond = this.computePixelsPerSecond();
    this.config.setTempoSpeed(pixelsPerSecond / 1000);
  }

  getTempo(): number {
    return this.tempo;
  }

  getContext(): RenderContext | null {
    return this.context ?? null;
  }

  getLayout(): StaffLayout {
    return this.layout;
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

  private handleNoteClick(note: StaveNote) {
    const hasVisibleSpan = note.noteSpans.some((span) => span.isVisible());
    if (hasVisibleSpan) {
      note.hideNoteSpan();
    } else {
      note.showNoteSpan();
    }
  }

  private handleDragStart() {
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
    if (this.keySignature) {
      scratch.addKeySignature(this.keySignature);
    }
    const noteStartX = scratch.getNoteStartX();
    const paddingRight = this.config.get('Stave.paddingRight', 0);
    const endPadding = this.config.get('Stave.endPaddingMax', 0);
    const paddingLeft = this.config.get('Stave.paddingLeft', 0);
    const computed = noteStartX + paddingRight + endPadding + paddingLeft;
    const minWidth = this.layout.fixedStaveMinWidth;
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

  private deactivateScalePulse(options: { resetColor?: boolean } = {}) {
    const { resetColor = false } = options;
    if (this.scalePulseNoteIndex === null) return;
    const active = this.notes[this.scalePulseNoteIndex];
    if (!active) {
      this.scalePulseNoteIndex = null;
      return;
    }
    active.setScalePulseState(false);
    active.noteSpans.forEach((span) => span.resetOuterMode());
    if (resetColor) {
      this.resetNoteColor(active);
    }
    this.scalePulseNoteIndex = null;
  }

  private applyScalePulseToNote(index: number | null): StaveNote | null {
    this.deactivateScalePulse();

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

export type StaffSong = {
  tempo?: number;
  timeSignature: string;
  keySignature?: string;
  measures: Array<{ notes: StaveNoteStruct[] }>;
};
