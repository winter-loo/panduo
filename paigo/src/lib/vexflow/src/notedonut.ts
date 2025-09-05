// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { ElementStyle } from './element';
import { Note, NoteStruct } from './note';
import { Stave } from './stave';
import { Category } from './typeguard';
import { defined, log } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (NoteDonut.DEBUG) log('VexFlow.NoteDonut', args);
}

export interface NoteDonutStruct extends NoteStruct {
  line?: number;
  slashed?: boolean;
  style?: ElementStyle;
  customGlyphCode?: string;
  stemDirection?: number;
  displaced?: boolean;
  noteType?: string;
  x?: number;
  y?: number;
}

/**
 * `NoteHeads` are typically not manipulated
 * directly, but used internally in `StaveNote`.
 *
 * See `tests/notehead_tests.ts` for usage examples.
 */
export class NoteDonut extends Note {
  /** To enable logging for this class. Set `VexFlow.NoteHead.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.NoteDonut;
  }

  protected line: number;
  protected index?: number;
  private dom?: Element;
  private fullExpanded: boolean;
  private donutWidth: number;

  // map notehead SMuFL codes to the corresponding SMuFL code with ledger line
  protected ledger: Record<string, string> = {
    '\ue4e3' /*restWhole*/: '\ue4f4' /*restWholeLegerLine*/,
    '\ue4e4' /*restHalf*/: '\ue4f5' /*restHalfLegerLine*/,
  };

  constructor(noteStruct: NoteDonutStruct) {
    super(noteStruct);

    this.fullExpanded = false;
    this.donutWidth = 0;

    this.x = noteStruct.x || 0;
    this.y = noteStruct.y || 0;
    this.line = noteStruct.line || 0;

    // Get glyph code based on duration and note type. This could be
    // regular notes, rests, or other custom codes.
    this.glyphProps = Note.getGlyphProps(this.duration, this.noteType);
    defined(
      this.glyphProps,
      'BadArguments',
      `No glyph found for duration '${this.duration}' and type '${this.noteType}'`
    );

    // Swap out the glyph with ledger lines
    if ((this.line > 5 || this.line < 0) && this.ledger[this.glyphProps.codeHead]) {
      this.glyphProps.codeHead = this.ledger[this.glyphProps.codeHead];
    }
    this.text = this.glyphProps.codeHead;

    this.setStyle(noteStruct.style ?? {});

    this.renderOptions = {
      ...this.renderOptions,
    };
  }

  getDom(): Element | undefined {
    return this.dom;
  }

  /** Get the width of the notehead. */
  override getWidth(): number {
    return this.width;
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
      console.log(`[donut] set y=${y}`);
      this.setY(y);
      this.setContext(this.stave.getContext());
    }
    return this;
  }

  /** Pre-render formatting. */
  override preFormat(): this {
    if (this.preFormatted) return this;

    const stave = this.getVoice().getStave();
    if (stave) {
      const justifyWidth = stave.getNoteEndX() - stave.getNoteStartX() - Stave.defaultPadding;
      const totalTicks = this.getVoice().getTotalTicks().value();
      const noteTicks = this.getTicks().value();
      this.setWidth(noteTicks / totalTicks * justifyWidth);
    }
    this.preFormatted = true;
    return this;
  }

  /** Draw the notehead. */
  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
   this.dom = ctx.openGroup('notedonut', this.getAttribute('id'));

    L("Drawing note donut ", this.noteType, this.duration, " at ", this.x, this.y);
    this.x = this.getAbsoluteX();
    this.drawDonut();
    ctx.closeGroup();
  }

  drawDonut(): this {
    const ctx = this.checkContext();
    let { x, y, w: width, h: height } = this.getBoundingBox();
    const staffLineWidth = 3;
    console.log(`draw notedonut, x=${x} y=${y} width=${width}, height=${height}`);

    ctx.openGroup('donut');
    ctx.fillRect(x + staffLineWidth * 2, y, 0, height,
      {
        class: 'inner',
        rx: height / 2, ry: height / 2,
        opacity: 0.5,
      });
    const outWidth = width;
    const outHeight = height + staffLineWidth * 4;
    console.log(`draw notedonut, outWidth: ${outWidth}, outHeight: ${outHeight}`);
    ctx.rect(x, y - staffLineWidth * 2, outWidth, outHeight, {
      rx: outHeight / 2, ry: outHeight / 2,
      fill: 'none',
      'stroke-width': staffLineWidth,
      stroke: 'currentColor',
      'pointer-events': 'auto',
      opacity: 0.3,
    });
    ctx.closeGroup();
    return this;
  }

  expandTo(x: number, timestamp?: DOMHighResTimeStamp): boolean {
    if (!this.dom) return true;
    if (this.fullExpanded) return true;
    let { w: width, h: height } = this.getBoundingBox();
    const staffLineWidth = 3;

    const rect = this.dom.querySelector('.donut .inner');
    // outter rect has 2px border
    // minimum width: height - 4
    let donutWidth = Math.min(width, Math.max(x, height - 4));
    if (donutWidth == width && !this.fullExpanded) {
      this.fullExpanded = true;
      console.log('done full expanded, ', timestamp, donutWidth);
      // actual maximum width
      donutWidth = donutWidth - staffLineWidth * 4;
    }
    donutWidth = Math.min(width - staffLineWidth * 4, donutWidth);

    rect?.setAttribute('width', `${donutWidth}`);
    // when we first reached the desired width, we still return false
    return false;
  }

  expandToDelta(x: number, timestamp?: DOMHighResTimeStamp): boolean {
    if (!this.dom) return true;
    if (this.fullExpanded) return true;
    let { w: width, h: height } = this.getBoundingBox();
    const staffLineWidth = 3;

    const rect = this.dom.querySelector('.donut .inner');

    let donutWidth = this.donutWidth + x;
    // outter rect has 2px border
    // minimum width: height - 4
    donutWidth = Math.min(width, Math.max(donutWidth, height - 4));
    this.donutWidth = donutWidth;
    if (donutWidth == width && !this.fullExpanded) {
      this.fullExpanded = true;
      console.log('done full expanded, ', timestamp, donutWidth);
    }
    donutWidth = Math.min(width - 4 * staffLineWidth, donutWidth);

    rect?.setAttribute('width', `${donutWidth}`);
    // when we first reached the desired width, we still return false
    return false;
  }
}
