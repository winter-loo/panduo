// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// Co-author: Benjamin W. Bohl

import { VexflowConfig } from './config';
import type { ClefConfigEntry, VexflowConfigInstance, DeepPartial } from './config';
import { ElementStyle } from './element';
import { Glyphs } from './glyphs';
import { Stave } from './stave';
import { StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Category } from './typeguard';
import { log } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (Clef.DEBUG) log('VexFlow.Clef', args);
}

export interface ClefOptions {
  size?: string;
  annotation?: string;
  style?: ElementStyle;
  config?: VexflowConfigInstance;
}

/**
 * Clef implements various types of clefs that can be rendered on a stave.
 *
 * See `tests/clef_tests.ts` for usage examples.
 */
export class Clef extends StaveModifier {
  /** To enable logging for this class, set `VexFlow.Clef.DEBUG` to `true`. */
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.Clef;
  }

  /**
   * The attribute `clef` must be a key from
   * `Clef.types`
   */
  code = Clef.types['treble'].code;
  line = Clef.types['treble'].line;

  protected size = 'default';
  protected type = 'treble';
  protected config: VexflowConfigInstance;

  /**
   * Every clef name is associated with a glyph code from the font file
   * and a default stave line number.
   */
  static get types(): Record<string, { code: string; line: number }> {
    const { gClef, fClef, cClef, unpitchedPercussionClef1, sixStringTabClef } = Glyphs;

    return {
      treble: {
        code: gClef,
        line: 3,
      },
      bass: {
        code: fClef,
        line: 1,
      },
      alto: {
        code: cClef,
        line: 2,
      },
      tenor: {
        code: cClef,
        line: 1,
      },
      percussion: {
        code: unpitchedPercussionClef1,
        line: 2,
      },
      soprano: {
        code: cClef,
        line: 4,
      },
      'mezzo-soprano': {
        code: cClef,
        line: 3,
      },
      'baritone-c': {
        code: cClef,
        line: 0,
      },
      'baritone-f': {
        code: fClef,
        line: 2,
      },
      subbass: {
        code: fClef,
        line: 0,
      },
      french: {
        code: gClef,
        line: 4,
      },
      tab: {
        code: sixStringTabClef,
        line: 2.5,
      },
    };
  }

  /** Create a new clef. */
  constructor(type: string, options?: ClefOptions) {
    super();

    const { config: providedConfig, ...optionOverrides } = options ?? {};
    const configInstance = providedConfig ?? VexflowConfig.defaults();
    const resolved = configInstance.clef(
      type,
      optionOverrides as DeepPartial<ClefConfigEntry>,
    );
    this.config = configInstance;

    this.setPosition(StaveModifierPosition.BEGIN);
    this.setType(type, resolved.size, resolved.annotation);

    const style = resolved.style;
    if (style && Object.keys(style).length > 0) this.setStyle(style);
    L('Creating clef:', type);
  }

  /** Set clef type, size and annotation. */
  setType(type: string, size: string = 'default', annotation?: string): this {
    this.type = type;
    this.code = Clef.types[type].code;
    this.line = Clef.types[type].line;
    this.size = size ?? 'default';

    // If an annotation, such as 8va, is specified, add it to the Clef object.
    if (annotation === '8va') {
      if (this.code === Glyphs.gClef) {
        this.code = Glyphs.gClef8va;
      }
      if (this.code === Glyphs.fClef) {
        this.code = Glyphs.fClef8va;
      }
    }
    if (annotation === '8vb') {
      if (this.code === Glyphs.gClef) {
        this.code = Glyphs.gClef8vb;
      }
      if (this.code === Glyphs.fClef) {
        this.code = Glyphs.fClef8vb;
      }
    }
    this.text = this.code;
    this.fontInfo.size = Math.floor(this.getPoint(this.size));

    return this;
  }

  /** Get point for clefs. */
  getPoint(size?: string): number {
    // for sizes other than 'default', clef is 2/3 of the default value
    const baseSize = this.config.fontSize;
    return size === 'default' ? baseSize : (baseSize * 2) / 3;
  }

  /** Set associated stave. */
  override setStave(stave: Stave): this {
    this.stave = stave;
    this.config = stave.getConfig() ?? this.config;
    return this;
  }

  /** Render clef. */
  override draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();
    this.setRendered();

    ctx.openGroup('clef', this.getAttribute('id'));

    this.y = stave.getYForLine(this.line);
    let fillStyle = this.getStyle().fillStyle ?? 'currentColor';
    this.renderText(ctx, this.padding, 0, {
      fill: fillStyle,
    });
    this.drawPointerRect();
    ctx.closeGroup();
  }
}
