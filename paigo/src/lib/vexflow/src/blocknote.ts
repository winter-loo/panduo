// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// This file implements notes for standard notation. This consists of one or
// more `NoteHeads`, an optional stem, and an optional flag.
//
// Throughout these comments, a "note" refers to the entire `BlockNote`,
// and a "key" refers to a specific pitch/notehead within a note.
//
// See `tests/stavenote_tests.ts` for usage examples.

import { BoundingBox } from './boundingbox';
import { ElementStyle } from './element';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { ModifierContextState } from './modifiercontext';
import { KeyProps, Note, NoteStruct } from './note';
import { Stave } from './stave';
import { Tables } from './tables';
import { TickContext } from './tickcontext';
import { Category } from './typeguard';
import { defined, log, midLine, RuntimeError } from './util';
import { Voice } from './voice';

export interface BlockNoteHeadBounds {
  yTop: number;
  yBottom: number;
  displacedX?: number;
  nonDisplacedX?: number;
  highestLine: number;
  lowestLine: number;
  highestDisplacedLine?: number;
  lowestDisplacedLine?: number;
  highestNonDisplacedLine: number;
  lowestNonDisplacedLine: number;
}

export interface BlockNoteFormatSettings {
  line: number;
  maxLine: number;
  minLine: number;
  isrest: boolean;
  voiceShift: number;
  isDisplaced: boolean;
  note: BlockNote;
}

export interface BlockNoteStruct extends NoteStruct {
  strokePx?: number;
  octaveShift?: number;
  clef?: string;
}

// To enable logging for this class. Set `VexFlow.BlockNote.DEBUG` to `true`.
// eslint-disable-next-line
function L(...args: any[]) {
  if (BlockNote.DEBUG) log('VexFlow.BlockNote', args);
}

// Helper methods for rest positioning in ModifierContext.
function shiftRestVertical(
  rest: BlockNoteFormatSettings,
  _note: BlockNoteFormatSettings,
  dir: number,
) {
  const delta = dir;

  rest.line += delta;
  rest.maxLine += delta;
  rest.minLine += delta;
  rest.note.setKeyLine(0, rest.note.getKeyLine(0) + delta);
}

// Called from formatNotes :: center a rest between two notes
function centerRest(
  rest: BlockNoteFormatSettings,
  noteU: BlockNoteFormatSettings,
  noteL: BlockNoteFormatSettings,
) {
  const delta = rest.line - midLine(noteU.minLine, noteL.maxLine);
  rest.note.setKeyLine(0, rest.note.getKeyLine(0) - delta);
  rest.line -= delta;
  rest.maxLine -= delta;
  rest.minLine -= delta;
}

export interface NoteRectStruct extends NoteStruct {
  line?: number;
  slashed?: boolean;
  style?: ElementStyle;
  customGlyphCode?: string;
  stemDirection?: number;
  displaced?: boolean;
  noteType?: string;
  x?: number;
  y?: number;
  index?: number;
  pitch: string;
}

/**
 * `NoteHeads` are typically not manipulated
 * directly, but used internally in `StaveNote`.
 *
 * See `tests/notehead_tests.ts` for usage examples.
 */
export class NoteRect extends Note {
  /** To enable logging for this class. Set `VexFlow.NoteHead.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.NoteRect;
  }

  protected displaced: boolean;

  protected line: number;
  protected pitch: string;
  protected index?: number;
  protected slashed: boolean;

  constructor(noteStruct: NoteRectStruct) {
    super(noteStruct);

    this.index = noteStruct.index;
    this.x = noteStruct.x || 0;
    this.y = noteStruct.y || 0;
    if (noteStruct.noteType) this.noteType = noteStruct.noteType;
    this.displaced = noteStruct.displaced || false;
    this.line = noteStruct.line || 0;
    this.pitch = noteStruct.pitch;
    let i = this.pitch.indexOf('/');
    if (i != -1) {
      this.pitch = this.pitch.substring(0, i) + this.pitch.substring(i + 1, i + 2);
    }

    this.setStyle(noteStruct.style ?? {});
    this.slashed = noteStruct.slashed || false;

    this.renderOptions = {
      ...this.renderOptions,
    };
  }
  /** Get the width of the notehead. */
  override get width(): number {
    if (this.stave && !this._width) {
      const totalTicks = this.getVoice().getTotalTicks().value();
      const myTicks = this.getTicks().value();
      this._width = (this.stave.getJustifyWidth() * myTicks) / totalTicks;
    }
    return this._width;
  }

  override set width(width: number) {
    this._width = width;
  }

  override getWidth(): number {
    return this.width;
  }

  override get height(): number {
    if (this.stave && !this._height) {
      this._height = this.stave.getSpacingBetweenLines() + (this.stave.getStyle().lineWidth ?? 0);
    }
    return this._height;
  }

  override set height(height: number) {
    this._height = height;
  }

  override getHeight(): number {
    return this.height;
  }

  /** Determine if the notehead is displaced. */
  isDisplaced(): boolean {
    return this.displaced === true;
  }

  /** Get the stave line the notehead is placed on. */
  getLine(): number {
    return this.line;
  }

  /** Set the stave line the notehead is placed on. */
  setLine(line: number): this {
    this.line = line;
    return this;
  }

  /** Get the canvas `x` coordinate position of the notehead. */
  override getAbsoluteX(): number {
    // If the note has not been preformatted, then get the static x value
    // Otherwise, it's been formatted and we should use it's x value relative
    // to its tick context
    const x = !this.preFormatted ? this.x : super.getAbsoluteX();

    return x;
  }

  /** Set notehead to a provided `stave`. */
  override setStave(stave: Stave): this {
    const line = this.getLine();

    this.stave = stave;
    if (this.stave) {
      let y = this.stave.getYForNote(line);
      console.log(`[noterect] set line=${line} y=${y}`);
      this.setY(y);
      this.setContext(this.stave.getContext());
    }
    return this;
  }

  /** Pre-render formatting. */
  override preFormat(): this {
    if (this.preFormatted) return this;

    this.preFormatted = true;
    return this;
  }

  /** Draw the notehead. */
  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();

    const classList = ['noterect', `pitch-${this.pitch}`];
    ctx.openGroup(classList, this.getAttribute('id'));

    let { x, y, w: width, h: height } = this.getBoundingBox();

    L(
      'Drawing note rect pitch=',
      this.pitch,
      ' duration=',
      this.duration,
      ' x=',
      x,
      ' y=',
      y,
      ' width=',
      width,
      ' height=',
      height,
    );
    this.getContext()?.fillRect(x, y - height / 2, width, height, {
      rx: 3,
      ry: 3,
    });
    (this.parent as BlockNote)?.drawModifiers(this);
    ctx.closeGroup();
  }
}

export class BlockNote extends Note {
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.BlockNote;
  }

  static get LEDGER_LINE_OFFSET(): number {
    return 3;
  }

  static get minNoteheadPadding(): number {
    return Metrics.get('NoteHead.minPadding');
  }

  /** Format notes inside a ModifierContext. */
  static format(notes: BlockNote[], state: ModifierContextState): boolean {
    if (!notes || notes.length < 2) return false;

    const notesList: BlockNoteFormatSettings[] = [];

    for (let i = 0; i < notes.length; i++) {
      // Formatting uses sortedKeyProps to calculate line and minL.
      const props = notes[i].sortedKeyProps;
      const line = props[0].keyProps.line;
      let minL = props[props.length - 1].keyProps.line;

      let maxL;
      if (notes[i].isRest()) {
        maxL =
          line +
          Math.ceil(
            notes[i]._noteHeads[0].getTextMetrics().actualBoundingBoxAscent /
              Tables.STAVE_LINE_DISTANCE,
          );
        minL =
          line -
          Math.ceil(
            notes[i]._noteHeads[0].getTextMetrics().actualBoundingBoxDescent /
              Tables.STAVE_LINE_DISTANCE,
          );
      } else {
        maxL = props[props.length - 1].keyProps.line;
        minL = props[0].keyProps.line;
      }

      notesList.push({
        line: props[0].keyProps.line, // note/rest base line
        maxLine: maxL, // note/rest upper bounds line
        minLine: minL, // note/rest lower bounds line
        isrest: notes[i].isRest(),
        voiceShift: notes[i].getVoiceShiftWidth(),
        isDisplaced: notes[i].isDisplaced(), // note manually displaced
        note: notes[i],
      });
    }

    let voices = 0;
    let noteU = undefined;
    let noteM = undefined;
    let noteL = undefined;
    const draw = [false, false, false];

    for (let i = 0; i < notesList.length; i++) {
      // If .draw is true or undefined, we set draw[i] = true
      draw[i] = notesList[i].note.renderOptions.draw !== false;
    }

    if (draw[0] && draw[1] && draw[2]) {
      // Three visible notes
      voices = 3;
      noteU = notesList[0];
      noteM = notesList[1];
      noteL = notesList[2];
    } else if (draw[0] && draw[1]) {
      // Two visible notes, 0 & 1
      voices = 2;
      noteU = notesList[0];
      noteL = notesList[1];
    } else if (draw[0] && draw[2]) {
      // Two visible notes, 0 & 2
      voices = 2;
      noteU = notesList[0];
      noteL = notesList[2];
    } else if (draw[1] && draw[2]) {
      // Two visible notes, 1 & 2
      voices = 2;
      noteU = notesList[1];
      noteL = notesList[2];
    } else {
      // No shift required for less than 2 visible notes
      return true;
    }

    const voiceXShift = Math.max(noteU.voiceShift, noteL.voiceShift);
    let xShift = 0;

    // Test for two voice note intersection
    if (voices === 2) {
      const lineSpacing = 0;
      if (noteL.isrest && noteU.isrest && noteU.note.duration === noteL.note.duration) {
        noteL.note.renderOptions.draw = false;
      } else if (noteU.minLine <= noteL.maxLine + lineSpacing) {
        if (noteU.isrest) {
          // shift rest up
          shiftRestVertical(noteU, noteL, 1);
        } else if (noteL.isrest) {
          // shift rest down
          shiftRestVertical(noteL, noteU, -1);
        } else {
          //Instead of shifting notes, remove the appropriate flag
          //If we are sharing a line, switch one notes stem direction.
          //If we are sharing a line and in the same voice, only then offset one note
          const lineDiff = Math.abs(noteU.line - noteL.line);
          if (lineDiff < 1) {
            xShift = voiceXShift + 2;
            if (noteU.note.duration < noteL.note.duration) {
              // upper voice is shorter, so shift it right
              noteU.note.setXShift(xShift);
            } else {
              // shift lower voice right
              noteL.note.setXShift(xShift);
            }
          }
        }
      }

      // format complete
      state.rightShift += xShift;
      return true;
    }

    if (!noteM) throw new RuntimeError('InvalidState', 'noteM not defined.');

    // For three voices, test if rests can be repositioned
    //
    // Special case 1 :: middle voice rest between two notes
    //
    if (noteM.isrest && !noteU.isrest && !noteL.isrest) {
      if (noteU.minLine <= noteM.maxLine || noteM.minLine <= noteL.maxLine) {
        const restHeight = noteM.maxLine - noteM.minLine;
        const space = noteU.minLine - noteL.maxLine;
        if (restHeight < space) {
          // center middle voice rest between the upper and lower voices
          centerRest(noteM, noteU, noteL);
        } else {
          xShift = voiceXShift + 2; // shift middle rest right
          noteM.note.setXShift(xShift);
        }
        // format complete
        state.rightShift += xShift;
        return true;
      }
    }

    // Special case 2 :: all voices are rests
    if (noteU.isrest && noteM.isrest && noteL.isrest) {
      // Hide upper voice rest
      noteU.note.renderOptions.draw = false;
      // Hide lower voice rest
      noteL.note.renderOptions.draw = false;
      // format complete
      state.rightShift += xShift;
      return true;
    }

    // Test if any other rests can be repositioned
    if (noteM.isrest && noteU.isrest && noteM.minLine <= noteL.maxLine) {
      // Hide middle voice rest
      noteM.note.renderOptions.draw = false;
    }
    if (noteM.isrest && noteL.isrest && noteU.minLine <= noteM.maxLine) {
      // Hide middle voice rest
      noteM.note.renderOptions.draw = false;
    }
    if (noteU.isrest && noteU.minLine <= noteM.maxLine) {
      // shift upper voice rest up;
      shiftRestVertical(noteU, noteM, 1);
    }
    if (noteL.isrest && noteM.minLine <= noteL.maxLine) {
      // shift lower voice rest down
      shiftRestVertical(noteL, noteM, -1);
    }
    // If middle voice intersects upper or lower voice
    if (noteU.minLine <= noteM.maxLine + 0.5 || noteM.minLine <= noteL.maxLine) {
      // shift middle note right
      xShift = voiceXShift + 2;
      noteM.note.setXShift(xShift);
    }

    state.rightShift += xShift;
    return true;
  }

  static postFormat(notes: Note[]): boolean {
    if (!notes) return false;

    notes.forEach((note) => note.postFormat());

    return true;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // INSTANCE MEMBERS

  minLine: number = 0;
  maxLine: number = 0;

  protected readonly clef: string;
  protected readonly octaveShift?: number;

  protected displaced: boolean;
  protected dotShiftY: number;
  protected useDefaultHeadX: boolean;
  protected ledgerLineStyle: ElementStyle;

  private _noteHeads: NoteRect[];

  // Sorted variant of keyProps used internally.
  private sortedKeyProps: { keyProps: KeyProps; index: number }[] = [];

  constructor(noteStruct: BlockNoteStruct) {
    super(noteStruct);

    this.ledgerLineStyle = {};

    this.clef = noteStruct.clef ?? 'treble';
    this.octaveShift = noteStruct.octaveShift ?? 0;

    // if true, displace note to right
    this.displaced = false;
    this.dotShiftY = 0;
    // for displaced ledger lines
    this.useDefaultHeadX = false;

    // Drawing
    this._noteHeads = [];
    this.modifiers = [];

    this.renderOptions = {
      ...this.renderOptions,
      // number of stroke px to the left and right of head
      strokePx: noteStruct.strokePx || BlockNote.LEDGER_LINE_OFFSET,
    };

    this.calculateKeyProps();
    this.reset();
  }

  override reset(): this {
    super.reset();

    // Save prior noteHead styles & reapply them after making new noteheads.
    const noteHeadStyles = this._noteHeads.map((noteHead) => noteHead.getStyle());
    this.buildNoteHeads();
    this._noteHeads.forEach((noteHead, index) => {
      const noteHeadStyle = noteHeadStyles[index];
      if (noteHeadStyle) noteHead.setStyle(noteHeadStyle);
    });

    const stave = this.stave;
    if (stave) {
      this.setStave(stave);
    }
    this.calcNoteDisplacements();
    return this;
  }

  override setVoice(voice: Voice): this {
    this.voice = voice;

    this._noteHeads.forEach((note) => note.setVoice(voice));
    this.preFormatted = false;
    return this;
  }

  override setTickContext(tc: TickContext): this {
    this.tickContext = tc;
    this.preFormatted = false;
    return this;
  }

  // Builds a `NoteHead` for each key in the note
  buildNoteHeads(): NoteRect[] {
    this._noteHeads = [];
    const keys = this.getKeys();

    let lastLine = undefined;
    let lineDiff = undefined;
    let displaced = false;

    // Draw notes from bottom to top.
    for (let i = 0; i !== keys.length; i += 1) {
      // Building noteheads rely on sortedKeNotes in order to calculate the displacements
      const noteProps = this.sortedKeyProps[i].keyProps;
      const line = noteProps.line;

      // Keep track of last line with a note head, so that consecutive heads
      // are correctly displaced.
      if (lastLine === undefined) {
        lastLine = line;
      } else {
        lineDiff = Math.abs(lastLine - line);
        if (lineDiff === 0 || lineDiff === 0.5) {
          displaced = !displaced;
        } else {
          displaced = false;
          this.useDefaultHeadX = true;
        }
      }
      lastLine = line;

      const notehead = new NoteRect({
        pitch: keys[i],
        duration: this.duration,
        line: noteProps.line,
      });

      console.log(`notehead is built, line=${line}, width=${notehead.width}`);

      this.addChild(notehead);
      this._noteHeads[this.sortedKeyProps[i].index] = notehead;
    }
    return this._noteHeads;
  }

  // Calculates and stores the properties for each key in the note
  calculateKeyProps(): void {
    let lastLine: number | undefined;
    for (let i = 0; i < this.keys.length; ++i) {
      const key = this.keys[i];

      const options = { octaveShift: this.octaveShift ?? 0, duration: this.duration };
      const props = Tables.keyProperties(key, this.clef, this.noteType, options);

      if (!props) {
        throw new RuntimeError('BadArguments', `Invalid key for note properties: ${key}`);
      }

      // Override line placement for default rests
      if (props.key === 'R') {
        if (this.duration === '1' || this.duration === 'w') {
          props.line = 4;
        } else {
          props.line = 3;
        }
      }

      // Calculate displacement of this note
      const line = props.line;
      if (lastLine === undefined) {
        lastLine = line;
      } else {
        // < 1 means == 0.5 (second) or 0.0 (unison)
        if (Math.abs(lastLine - line) < 1) {
          this.displaced = true;
          props.displaced = true;

          // Have to mark the previous note as
          // displaced as well, for modifier placement
          if (this.keyProps.length > 0) {
            this.keyProps[i - 1].displaced = true;
          }
        }
      }

      lastLine = line;
      this.keyProps.push(props);
    }
    // Sort the notes from lowest line to highest line in sortedKeyProps
    // Warn no longer required as keyProps remains unsorted
    this.keyProps.forEach((keyProps, index) => {
      this.sortedKeyProps.push({ keyProps, index });
    });
    this.sortedKeyProps.sort((a, b) => a.keyProps.line - b.keyProps.line);
  }

  // Get the `BoundingBox` for the entire note
  override getBoundingBox(): BoundingBox {
    const boundingBox = new BoundingBox(this.getAbsoluteX(), this.ys[0], 0, 0);
    this._noteHeads.forEach((notehead) => {
      boundingBox.mergeWith(notehead.getBoundingBox());
    });
    for (let i = 0; i < this.modifiers.length; i++) {
      boundingBox.mergeWith(this.modifiers[i].getBoundingBox());
    }
    return boundingBox;
  }

  // Gets the line number of the bottom note in the chord.
  // If `isTopNote` is `true` then get the top note's line number instead
  override getLineNumber(isTopNote?: boolean): number {
    if (!this.keyProps.length) {
      throw new RuntimeError(
        'NoKeyProps',
        "Can't get bottom note line, because note is not initialized properly.",
      );
    }

    let resultLine = this.keyProps[0].line;

    // No precondition assumed for sortedness of keyProps array
    for (let i = 0; i < this.keyProps.length; i++) {
      const thisLine = this.keyProps[i].line;
      if (isTopNote) {
        if (thisLine > resultLine) resultLine = thisLine;
      } else {
        if (thisLine < resultLine) resultLine = thisLine;
      }
    }

    return resultLine;
  }

  /**
   * @returns true if this note is a type of rest. Rests don't have pitches, but take up space in the score.
   */
  override isRest(): boolean {
    const val = this.glyphProps.codeHead;
    return val >= '\ue4e0' && val <= '\ue4ff';
  }

  // Determine if the current note is a chord
  isChord(): boolean {
    return !this.isRest() && this.keys.length > 1;
  }

  // Get the `y` coordinate for text placed on the top/bottom of a
  // note at a desired `textLine`
  override getYForTopText(textLine: number): number {
    const extents = this.getStemExtents();
    return Math.min(
      this.checkStave().getYForTopText(textLine),
      extents.topY - this.renderOptions.annotationSpacing * (textLine + 1),
    );
  }

  // Sets the current note to the provided `stave`. This applies
  // `y` values to the `NoteHeads`.
  override setStave(stave: Stave): this {
    super.setStave(stave);

    const ys = this._noteHeads.map((notehead) => {
      notehead.setStave(stave);
      return notehead.getY();
    });

    this.setYs(ys);

    return this;
  }

  // Check if note is shifted to the right
  isDisplaced(): boolean {
    return this.displaced;
  }

  // Sets whether shift note to the right. `displaced` is a `boolean`
  setNoteDisplaced(displaced: boolean): this {
    this.displaced = displaced;
    return this;
  }

  // Get the starting `x` coordinate for a `StaveTie`
  override getTieRightX(): number {
    let tieStartX = this.getAbsoluteX();
    tieStartX += this.getGlyphWidth() + this.xShift + this.rightDisplacedHeadPx;
    if (this.modifierContext) tieStartX += this.modifierContext.getRightShift();
    return tieStartX;
  }

  // Get the ending `x` coordinate for a `StaveTie`
  override getTieLeftX(): number {
    let tieEndX = this.getAbsoluteX();
    tieEndX += this.xShift - this.leftDisplacedHeadPx;
    return tieEndX;
  }

  // Get the stave line on which to place a rest
  override getLineForRest(): number {
    let restLine = this.keyProps[0].line;
    if (this.keyProps.length > 1) {
      const lastLine = this.keyProps[this.keyProps.length - 1].line;
      const top = Math.max(restLine, lastLine);
      const bot = Math.min(restLine, lastLine);
      restLine = midLine(top, bot);
    }

    return restLine;
  }

  // Get the default `x` and `y` coordinates for the provided `position`
  // and key `index`
  override getModifierStartXY(
    position: number,
    index: number,
    _options: { forceFlagRight?: boolean } = {},
  ): { x: number; y: number } {
    if (!this.preFormatted) {
      throw new RuntimeError(
        'UnformattedNote',
        "Can't call GetModifierStartXY on an unformatted note",
      );
    }

    if (this.ys.length === 0) {
      throw new RuntimeError('NoYValues', 'No Y-Values calculated for this note.');
    }

    const { ABOVE, BELOW, LEFT, RIGHT } = Modifier.Position;
    let x = 0;
    if (position === LEFT) {
      // FIXME: Left modifier padding, move to font file
      x = -1 * 2;
    } else if (position === RIGHT) {
      // FIXME: Right modifier padding, move to font file
      x = this.getGlyphWidth() + this.xShift + 2;
    } else if (position === BELOW || position === ABOVE) {
      x = this.getGlyphWidth() / 2;
    }

    // addtional y shifts for rests
    let restShift = 0;
    switch (this._noteHeads[index].getText()) {
      case Glyphs.restWhole:
        restShift += 0.5;
        break;
      case Glyphs.restHalf:
      case Glyphs.restQuarter:
      case Glyphs.rest8th:
      case Glyphs.rest16th:
        restShift -= 0.5;
        break;
      case Glyphs.rest32nd:
      case Glyphs.rest64th:
        restShift -= 1.5;
        break;
      case Glyphs.rest128th:
      case Glyphs.rest256th:
        restShift -= 2.5;
        break;
      case Glyphs.rest512th:
        restShift -= 3.5;
        break;
      case Glyphs.rest1024th:
        restShift -= 4.5;
        break;
    }

    return {
      x: this.getAbsoluteX() + x,
      y: this.ys[index] + restShift * this.checkStave().getSpacingBetweenLines(),
    };
  }

  // Sets the style of the complete BlockNote, including all keys
  // and the stem.
  override setStyle(style: ElementStyle): this {
    return super.setGroupStyle(style);
  }

  setLedgerLineStyle(style: ElementStyle): void {
    this.ledgerLineStyle = style;
  }

  getLedgerLineStyle(): ElementStyle {
    return this.ledgerLineStyle;
  }

  /** Get the glyph width. */
  override getGlyphWidth(): number {
    return this.noteHeads[0].getWidth();
  }

  override getX(): number {
    return this.noteHeads[0].getAbsoluteX();
  }

  // Sets the notehead at `index` to the provided coloring `style`.
  //
  // `style` is an `object` with the following properties: `shadowColor`,
  // `shadowBlur`, `fillStyle`, `strokeStyle`
  setKeyStyle(index: number, style: ElementStyle): this {
    this._noteHeads[index].setStyle(style);
    return this;
  }

  setKeyLine(index: number, line: number): this {
    this.keyProps[index].line = line;
    this.reset();
    return this;
  }

  getKeyLine(index: number): number {
    return this.keyProps[index].line;
  }

  // Get the width of the note if it is displaced. Used for `Voice`
  // formatting
  getVoiceShiftWidth(): number {
    // TODO: may need to accommodate for dot here.
    return this.getGlyphWidth() * (this.displaced ? 2 : 1);
  }

  // Calculates and sets the extra pixels to the left or right
  // if the note is displaced.
  calcNoteDisplacements(): void {
    this.setLeftDisplacedHeadPx(0);

    // For upstems with flags, the extra space is unnecessary, since it's taken
    // up by the flag.
    this.setRightDisplacedHeadPx(0);
  }

  // Pre-render formatting
  override preFormat(): void {
    if (this.preFormatted) return;

    let noteHeadPadding = 0;
    if (this.modifierContext) {
      this.modifierContext.preFormat();
      // If there are no modifiers on this note, make sure there is adequate padding
      // between the notes.
      if (this.modifierContext.getWidth() === 0) {
        noteHeadPadding = BlockNote.minNoteheadPadding;
      }
    }

    let width =
      this.getGlyphWidth() + this.leftDisplacedHeadPx + this.rightDisplacedHeadPx + noteHeadPadding;

    this.setWidth(width);

    this.preFormatted = true;
  }

  /**
   * Get the staff line and y value for the highest & lowest noteheads
   * @returns {noteHeadBounds}
   */
  getNoteHeadBounds(): BlockNoteHeadBounds {
    // Top and bottom Y values for stem.
    let yTop: number = +Infinity;
    let yBottom: number = -Infinity;
    let nonDisplacedX: number | undefined;
    let displacedX: number | undefined;

    let highestLine = this.checkStave().getNumLines();
    let lowestLine = 1;
    let highestDisplacedLine: number | undefined;
    let lowestDisplacedLine: number | undefined;
    let highestNonDisplacedLine = highestLine;
    let lowestNonDisplacedLine = lowestLine;

    this._noteHeads.forEach((notehead) => {
      const line: number = notehead.getLine();
      const y = notehead.getY();

      yTop = Math.min(y, yTop);
      yBottom = Math.max(y, yBottom);

      if (displacedX === undefined && notehead.isDisplaced()) {
        displacedX = notehead.getAbsoluteX();
      }

      if (nonDisplacedX === undefined && !notehead.isDisplaced()) {
        nonDisplacedX = notehead.getAbsoluteX();
      }

      highestLine = Math.max(line, highestLine);
      lowestLine = Math.min(line, lowestLine);

      if (notehead.isDisplaced()) {
        highestDisplacedLine =
          highestDisplacedLine === undefined ? line : Math.max(line, highestDisplacedLine);
        lowestDisplacedLine =
          lowestDisplacedLine === undefined ? line : Math.min(line, lowestDisplacedLine);
      } else {
        highestNonDisplacedLine = Math.max(line, highestNonDisplacedLine);
        lowestNonDisplacedLine = Math.min(line, lowestNonDisplacedLine);
      }
    }, this);

    return {
      yTop,
      yBottom,
      displacedX,
      nonDisplacedX,
      highestLine,
      lowestLine,
      highestDisplacedLine,
      lowestDisplacedLine,
      highestNonDisplacedLine,
      lowestNonDisplacedLine,
    };
  }

  // Get the starting `x` coordinate for the noteheads
  getNoteHeadBeginX(): number {
    return this.getAbsoluteX() + this.xShift;
  }

  // Get the ending `x` coordinate for the noteheads
  getNoteHeadEndX(): number {
    const xBegin = this.getNoteHeadBeginX();
    return xBegin + this.getGlyphWidth();
  }

  get noteHeads(): NoteRect[] {
    return this._noteHeads.slice();
  }

  // Draw the ledger lines between the stave and the highest/lowest keys
  drawLedgerLines(): void {
    const stave = this.checkStave();
    const {
      renderOptions: { strokePx },
    } = this;
    const ctx = this.checkContext();
    const width = this.getGlyphWidth() + strokePx * 2;
    const doubleWidth = 2 * (this.getGlyphWidth() + strokePx);

    if (this.isRest()) return;
    if (!ctx) {
      throw new RuntimeError('NoCanvasContext', "Can't draw without a canvas context.");
    }

    const {
      highestLine,
      lowestLine,
      highestDisplacedLine,
      highestNonDisplacedLine,
      lowestDisplacedLine,
      lowestNonDisplacedLine,
      displacedX,
      nonDisplacedX,
    } = this.getNoteHeadBounds();

    // Early out if there are no ledger lines to draw.
    if (highestLine < 6 && lowestLine > 0) return;

    const minX = Math.min(displacedX ?? 0, nonDisplacedX ?? 0);

    const drawLedgerLine = (y: number, normal: boolean, displaced: boolean) => {
      let x;
      if (displaced && normal) x = minX - strokePx;
      else if (normal) x = (nonDisplacedX ?? 0) - strokePx;
      else x = (displacedX ?? 0) - strokePx;
      const ledgerWidth = normal && displaced ? doubleWidth : width;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + ledgerWidth, y);
      ctx.stroke({
        stroke: '#dadada',
        'stroke-width': 3,
      });
    };

    const style = { ...stave.getDefaultLedgerLineStyle(), ...this.getLedgerLineStyle() };
    ctx.save();
    this.applyStyle(ctx, style);

    // Draw ledger lines below the staff:
    for (let line = 6; line <= highestLine; ++line) {
      const normal = nonDisplacedX !== undefined && line <= highestNonDisplacedLine;
      const displaced = highestDisplacedLine !== undefined && line <= highestDisplacedLine;
      drawLedgerLine(stave.getYForNote(line), normal, displaced);
    }

    // Draw ledger lines above the staff:
    for (let line = 0; line >= lowestLine; --line) {
      const normal = nonDisplacedX !== undefined && line >= lowestNonDisplacedLine;
      const displaced = lowestDisplacedLine !== undefined && line >= lowestDisplacedLine;
      drawLedgerLine(stave.getYForNote(line), normal, displaced);
    }

    ctx.restore();
  }

  // Draw all key modifiers
  drawModifiers(noteheadParam: NoteRect): void {
    const ctx = this.checkContext();
    for (let i = 0; i < this.modifiers.length; i++) {
      const modifier = this.modifiers[i];
      const index = modifier.checkIndex();
      const notehead = this._noteHeads[index];
      if (notehead === noteheadParam) {
        modifier.setContext(ctx);
        modifier.drawWithStyle();
      }
    }
  }

  // Draw the NoteHeads
  drawNoteHeads(): void {
    const ctx = this.checkContext();
    this._noteHeads.forEach((notehead) => {
      notehead.setContext(ctx).drawWithStyle();
    });
  }

  // Draws all the `BlockNote` parts. This is the main drawing method.
  override draw(): void {
    if (this.renderOptions.draw === false) return;

    if (this.ys.length === 0) {
      throw new RuntimeError('NoYValues', "Can't draw note without Y values.");
    }

    const ctx = this.checkContext();
    const xBegin = this.getNoteHeadBeginX();

    // Format note head x positions
    this._noteHeads.forEach((notehead) => notehead.setX(xBegin));

    L('Rendering ', this.isChord() ? 'chord :' : 'note :', this.keys);

    // Apply the overall style -- may be contradicted by local settings:
    const pitch = `pitch-${this.getPrimaryNoteName()}`;
    ctx.openGroup(['blocknote', pitch], this.getAttribute('id'));
    this.drawLedgerLines();
    this.drawNoteHeads();
    this.drawPointerRect();
    ctx.closeGroup();
    this.setRendered();
  }
}
