// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { GlyphFont } from './glyphfont';
import { Category } from './typeguard';
import { log } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (Flag.DEBUG) log('VexFlow.Flag', args);
}

/**
 * `Flags` are typically not manipulated
 * directly, but used internally in `StaveNote`.
 */
export class Flag extends Element {
  /** To enable logging for this class. Set `VexFlow.NoteHead.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.Flag;
  }

  /** Draw the notehead. */
  override draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    ctx.openGroup('flag', this.getAttribute('id'));

    L("Drawing flag '", this.text, "' at", this.x, this.y);
    GlyphFont.renderGlyph(
      ctx,
      this.text,
      this.fontInfo.family,
      this.fontSizeInPixels,
      this.x + this.xShift,
      this.y + this.yShift
    );
    this.drawPointerRect();
    ctx.closeGroup();
  }
}
