// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
//
// @author: Larry Kuhns 2011

import { ElementStyle } from './element';
import { Stave } from './stave';
import { LayoutMetrics, StaveModifier, StaveModifierPosition } from './stavemodifier';
import { Tables } from './tables';
import { Category } from './typeguard';
import { VexflowConfigInstance } from './config';

export enum BarlineType {
  SINGLE = 1,
  DOUBLE = 2,
  END = 3,
  REPEAT_BEGIN = 4,
  REPEAT_END = 5,
  REPEAT_BOTH = 6,
  NONE = 7,
}

export interface BarlineOptions {
  style?: ElementStyle;
}

export class Barline extends StaveModifier {
  static override get CATEGORY(): string {
    return Category.Barline;
  }

  protected lineWidths: Record<string, number>;
  protected paddings: Record<string, number>;
  protected layoutMetricsMap: Record<number, LayoutMetrics>;

  protected thickness: number;
  protected type!: BarlineType;

  options?: BarlineOptions;

  static get type(): typeof BarlineType {
    return BarlineType;
  }

  static get typeString(): Record<string, BarlineType> {
    return {
      single: BarlineType.SINGLE,
      double: BarlineType.DOUBLE,
      end: BarlineType.END,
      repeatBegin: BarlineType.REPEAT_BEGIN,
      repeatEnd: BarlineType.REPEAT_END,
      repeatBoth: BarlineType.REPEAT_BOTH,
      none: BarlineType.NONE,
    };
  }

  constructor(config: VexflowConfigInstance, type: BarlineType | string, options?: BarlineOptions) {
    super(config);
    this.thickness = Tables.STAVE_LINE_THICKNESS;
    this.options = options;

    const TYPE = BarlineType;
    this.lineWidths = {};
    this.lineWidths[TYPE.SINGLE] = this.config.get('Stave.style.lineWidth');
    this.lineWidths[TYPE.DOUBLE] = 5;
    this.lineWidths[TYPE.END] = 5;
    this.lineWidths[TYPE.REPEAT_BEGIN] = 5;
    this.lineWidths[TYPE.REPEAT_END] = 5;
    this.lineWidths[TYPE.REPEAT_BOTH] = 5;
    this.lineWidths[TYPE.NONE] = 5;

    this.paddings = {};
    this.paddings[TYPE.SINGLE] = 0;
    this.paddings[TYPE.DOUBLE] = 0;
    this.paddings[TYPE.END] = 0;
    this.paddings[TYPE.REPEAT_BEGIN] = 15;
    this.paddings[TYPE.REPEAT_END] = 15;
    this.paddings[TYPE.REPEAT_BOTH] = 15;
    this.paddings[TYPE.NONE] = 0;

    this.layoutMetricsMap = {};
    this.layoutMetricsMap[TYPE.SINGLE] = {
      xMin: 0,
      xMax: 1,
      paddingLeft: 5,
      paddingRight: 5,
    };
    this.layoutMetricsMap[TYPE.DOUBLE] = {
      xMin: -3,
      xMax: 1,
      paddingLeft: 5,
      paddingRight: 5,
    };
    this.layoutMetricsMap[TYPE.END] = {
      xMin: -5,
      xMax: 1,
      paddingLeft: 5,
      paddingRight: 5,
    };
    this.layoutMetricsMap[TYPE.REPEAT_END] = {
      xMin: -10,
      xMax: 1,
      paddingLeft: 5,
      paddingRight: 5,
    };
    this.layoutMetricsMap[TYPE.REPEAT_BEGIN] = {
      xMin: -2,
      xMax: 10,
      paddingLeft: 5,
      paddingRight: 5,
    };
    this.layoutMetricsMap[TYPE.REPEAT_BOTH] = {
      xMin: -10,
      xMax: 10,
      paddingLeft: 5,
      paddingRight: 5,
    };
    this.layoutMetricsMap[TYPE.NONE] = {
      xMin: 0,
      xMax: 0,
      paddingLeft: 5,
      paddingRight: 5,
    };
    this.setPosition(StaveModifierPosition.BEGIN);
    this.setType(type);
  }

  getType(): number {
    return this.type;
  }

  setType(type: string | number): this {
    this.type = typeof type === 'string' ? Barline.typeString[type] : type;

    this.setWidth(this.lineWidths[this.type]);
    this.setPadding(this.paddings[this.type]);
    this.setLayoutMetrics(this.layoutMetricsMap[this.type]);
    return this;
  }

  // Draw barlines
  override draw(): void {
    const stave = this.checkStave();
    const ctx = stave.checkContext();
    this.setRendered();

    ctx.openGroup('stavebarline', this.getAttribute('id'));
    switch (this.type) {
      case BarlineType.SINGLE:
        this.drawVerticalBar(stave, this.x, false);
        break;
      case BarlineType.DOUBLE:
        this.drawVerticalBar(stave, this.x, true);
        break;
      case BarlineType.END:
        this.drawVerticalEndBar(stave, this.x);
        break;
      case BarlineType.REPEAT_BEGIN:
        // If the barline is shifted over (in front of clef/time/key)
        // Draw vertical bar at the beginning.
        this.drawRepeatBar(stave, this.x, true);
        if (stave.getX() !== this.x) {
          this.drawVerticalBar(stave, stave.getX());
        }

        break;
      case BarlineType.REPEAT_END:
        this.drawRepeatBar(stave, this.x, false);
        break;
      case BarlineType.REPEAT_BOTH:
        this.drawRepeatBar(stave, this.x, false);
        this.drawRepeatBar(stave, this.x, true);
        break;
      default:
        // Default is NONE, so nothing to draw
        break;
    }
    this.drawPointerRect();
    ctx.closeGroup();
  }

  private resolveVisualStyle(stave: Stave): { lineWidth: number; color: string } {
    const staveStyle = stave.getBarlineStyle();
    const optionStyle = this.options?.style ?? {};
    const optionLineWidth = optionStyle.lineWidth;
    const lineWidth =
      optionLineWidth ??
      staveStyle.lineWidth ??
      this.lineWidths[BarlineType.SINGLE] ??
      this.config.get('Stave.style.lineWidth');
    const color =
      optionStyle.backgroundColor ??
      optionStyle.fillStyle ??
      optionStyle.strokeStyle ??
      staveStyle.backgroundColor ??
      staveStyle.fillStyle ??
      staveStyle.strokeStyle ??
      'currentColor';
    return { lineWidth, color };
  }

  override setStave(stave: Stave): this {
    super.setStave(stave);
    const { lineWidth } = this.resolveVisualStyle(stave);
    this.lineWidths[BarlineType.SINGLE] = lineWidth;
    if (this.type === BarlineType.SINGLE) {
      this.setWidth(lineWidth);
    }
    return this;
  }

  drawVerticalBar(stave: Stave, x: number, doubleBar?: boolean): void {
    const staveCtx = stave.checkContext();
    const topY = stave.getTopLineTopY();
    const botY = stave.getBottomLineBottomY();
    const { lineWidth, color } = this.resolveVisualStyle(stave);
    const staveLineWidth = stave.getStyle().lineWidth ?? lineWidth;
    const height = botY - topY;
    const spacing = lineWidth * 3;

    if (staveCtx.setFillStyle) {
      staveCtx.setFillStyle(color);
    }

    if (doubleBar) {
      staveCtx.fillRect(x - spacing, topY - staveLineWidth, lineWidth, height, {
        rx: 0,
        ry: 0,
        fill: color,
        stroke: 'none',
      });
    }
    // the top line is drawn with 'stroke-width'. By default, the stroke is
    // drawn centered on the shape’s edge: half of it goes outward, half inward.
    staveCtx.fillRect(x, topY - staveLineWidth / 2, lineWidth, height, {
      rx: 0,
      ry: 0,
      fill: color,
      stroke: 'none',
    });
  }

  drawVerticalEndBar(stave: Stave, x: number): void {
    const staveCtx = stave.checkContext();
    const topY = stave.getTopLineTopY();
    const botY = stave.getBottomLineBottomY();
    const { lineWidth, color } = this.resolveVisualStyle(stave);
    const height = botY - topY;
    const thinWidth = lineWidth;
    const thickWidth = lineWidth * 3;
    const spacing = lineWidth * 2;

    if (staveCtx.setFillStyle) {
      staveCtx.setFillStyle(color);
    }

    staveCtx.fillRect(x - (thickWidth + spacing), topY, thinWidth, height);
    staveCtx.fillRect(x - thickWidth, topY, thickWidth, height);
  }

  drawRepeatBar(stave: Stave, x: number, begin: boolean): void {
    const staveCtx = stave.checkContext();

    const topY = stave.getTopLineTopY();
    const botY = stave.getBottomLineBottomY();
    const { lineWidth, color } = this.resolveVisualStyle(stave);
    const height = botY - topY;
    const thinWidth = lineWidth;
    const thickWidth = lineWidth * 3;
    let xShift = 3 * lineWidth;

    if (!begin) {
      xShift = -5 * lineWidth;
    }

    if (staveCtx.setFillStyle) {
      staveCtx.setFillStyle(color);
    }

    staveCtx.fillRect(x + xShift, topY, thinWidth, height);
    staveCtx.fillRect(x - 2 * lineWidth, topY, thickWidth, height);

    const dotRadius = Math.max(lineWidth, 2);

    // Shift dots left or right
    if (begin) {
      xShift += 4 * lineWidth;
    } else {
      xShift -= 4 * lineWidth;
    }

    const dotX = x + xShift + dotRadius / 2;

    // calculate the y offset based on number of stave lines
    let yOffset = (stave.getNumLines() - 1) * stave.getSpacingBetweenLines();
    yOffset = yOffset / 2 - stave.getSpacingBetweenLines() / 2;
    let dotY = topY + yOffset + dotRadius / 2;

    // draw the top repeat dot
    staveCtx.beginPath();
    staveCtx.setFillStyle?.(color);
    staveCtx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2, false);
    staveCtx.fill();

    // draw the bottom repeat dot
    dotY += stave.getSpacingBetweenLines();
    staveCtx.beginPath();
    staveCtx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2, false);
    staveCtx.fill();
  }
}
