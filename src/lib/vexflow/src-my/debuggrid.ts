// Paigo customization: lightweight grid overlay for debugging VexFlow layout output.
import type { FontInfo } from './font';
import { RenderContext } from './rendercontext';
import type { TextMeasure } from './rendercontext';

const EPSILON = 1e-6;
const DEFAULT_MAJOR_MULTIPLIER = 5;

export interface DebugGridOptions {
  width?: number;
  height?: number;
  spacing?: number;
  majorSpacing?: number;
  offsetX?: number;
  offsetY?: number;
  minorLineWidth?: number;
  majorLineWidth?: number;
  originLineWidth?: number;
  minorStrokeStyle?: string;
  majorStrokeStyle?: string;
  originStrokeStyle?: string;
  showLabels?: boolean;
  labelFontFamily?: string;
  labelFontSize?: number;
  labelFontStyle?: string;
  labelFontWeight?: string | number;
  labelFillStyle?: string;
  labelPadding?: number;
  labelFormatter?: (value: number) => string;
  groupClassName?: string | string[];
  groupId?: string;
  wrapInGroup?: boolean;
  labelMajorLinesOnly?: boolean;
  includeOriginLabels?: boolean;
  labelProps?: Record<string, string | number>;
}

const defaultLabelFormatter = (value: number): string => {
  const normalized = Math.abs(value) < EPSILON ? 0 : value;
  const isInteger = Math.abs(normalized - Math.round(normalized)) < EPSILON;
  const formatted = isInteger
    ? Math.round(normalized).toString(10)
    : normalized.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  return formatted === '-0' ? '0' : formatted;
};

type InternalOptions = {
  width: number;
  height: number;
  spacing: number;
  majorSpacing: number;
  offsetX: number;
  offsetY: number;
  minorLineWidth: number;
  majorLineWidth: number;
  originLineWidth: number;
  minorStrokeStyle: string;
  majorStrokeStyle: string;
  originStrokeStyle: string;
  showLabels: boolean;
  labelFontFamily: string;
  labelFontSize: number;
  labelFontStyle: string;
  labelFontWeight: string | number;
  labelFillStyle: string;
  labelPadding: number;
  labelFormatter: (value: number) => string;
  groupClassName?: string | string[];
  groupId?: string;
  wrapInGroup: boolean;
  labelMajorLinesOnly: boolean;
  includeOriginLabels: boolean;
  labelProps?: Record<string, string | number>;
};

export class DebugGrid {
  private options: InternalOptions;
  private groupElement: SVGGElement | null = null;

  constructor(private readonly ctx: RenderContext, options: DebugGridOptions = {}) {
    const spacing = Math.max(options.spacing ?? 10, EPSILON);
    const majorSpacing = Math.max(options.majorSpacing ?? spacing * DEFAULT_MAJOR_MULTIPLIER, spacing);
    const width = options.width ?? this.resolveDimension('width');
    const height = options.height ?? this.resolveDimension('height');

    this.options = {
      width,
      height,
      spacing,
      majorSpacing,
      offsetX: options.offsetX ?? 0,
      offsetY: options.offsetY ?? 0,
      minorLineWidth: options.minorLineWidth ?? 0.5,
      majorLineWidth: options.majorLineWidth ?? 0.75,
      originLineWidth: options.originLineWidth ?? 1,
      minorStrokeStyle: options.minorStrokeStyle ?? '#cccccc',
      majorStrokeStyle: options.majorStrokeStyle ?? '#ff6666',
      originStrokeStyle: options.originStrokeStyle ?? '#4287f5',
      showLabels: options.showLabels ?? true,
      labelFontFamily: options.labelFontFamily ?? 'sans-serif',
      labelFontSize: options.labelFontSize ?? 9,
      labelFontStyle: options.labelFontStyle ?? 'normal',
      labelFontWeight: options.labelFontWeight ?? 'normal',
      labelFillStyle: options.labelFillStyle ?? '#666666',
      labelPadding: options.labelPadding ?? 4,
      labelFormatter: options.labelFormatter ?? defaultLabelFormatter,
      groupClassName: options.groupClassName ?? 'vf-debug-grid',
      groupId: options.groupId,
      wrapInGroup: options.wrapInGroup ?? true,
      labelMajorLinesOnly: options.labelMajorLinesOnly ?? true,
      includeOriginLabels: options.includeOriginLabels ?? true,
      labelProps: options.labelProps,
    };
  }

  draw(): SVGGElement | null {
    const { width, height, spacing } = this.options;
    if (width <= 0 || height <= 0 || spacing <= 0) {
      return null;
    }

    let groupOpened = false;
    if (this.options.wrapInGroup) {
      const maybeGroup = this.ctx.openGroup(this.options.groupClassName, this.options.groupId);
      if (maybeGroup instanceof SVGGElement) {
        this.groupElement = maybeGroup;
        groupOpened = true;
      } else if (maybeGroup) {
        // Some RenderContext implementations may return truthy values without being SVG groups.
        groupOpened = true;
      }
    }

    this.ctx.save();
    this.ctx.setLineDash([]);
    this.ctx.setShadowBlur(0);
    this.ctx.setShadowColor('transparent');

    let labelMetrics: TextMeasure | null = null;
    if (this.options.showLabels) {
      const fontInfo: FontInfo = {
        family: this.options.labelFontFamily,
        size: `${this.options.labelFontSize}px`,
        style: this.options.labelFontStyle,
        weight: this.options.labelFontWeight,
      };
      this.ctx.setFont(fontInfo);
      this.ctx.setFillStyle(this.options.labelFillStyle);
      labelMetrics = this.ctx.measureText('0');
    }

    this.drawVerticalLines(labelMetrics);
    this.drawHorizontalLines(labelMetrics);

    this.ctx.restore();

    if (groupOpened) {
      this.ctx.closeGroup();
    }

    return this.groupElement;
  }

  clear(): void {
    if (this.groupElement && this.groupElement.parentNode) {
      this.groupElement.parentNode.removeChild(this.groupElement);
      this.groupElement = null;
    }
  }

  getGroupElement(): SVGGElement | null {
    return this.groupElement;
  }

  private drawVerticalLines(labelMetrics: TextMeasure | null): void {
    const { width, height, spacing, offsetX, offsetY } = this.options;
    const start = offsetX;
    const end = offsetX + width;
    const firstIndex = Math.floor(start / spacing);
    const lastIndex = Math.ceil(end / spacing);

    for (let index = firstIndex; index <= lastIndex; index++) {
      const worldX = index * spacing;
      const x = worldX - offsetX;
      if (x < -EPSILON || x > width + EPSILON) continue;

      const isOrigin = Math.abs(worldX) < EPSILON;
      const isMajor = this.isMajor(worldX);
      const { strokeStyle, lineWidth } = this.getLineStyle(isOrigin, isMajor);

      this.ctx.beginPath();
      this.ctx.moveTo(x, offsetY);
      this.ctx.lineTo(x, offsetY + height);
      this.ctx.setStrokeStyle(strokeStyle);
      this.ctx.setLineWidth(lineWidth);
      this.ctx.closePath();
      this.ctx.stroke();

      if (this.shouldRenderLabel(isOrigin, isMajor)) {
        const label = this.options.labelFormatter(worldX);
        if (label) {
          const labelHeight = labelMetrics?.height ?? this.options.labelFontSize;
          const y = offsetY + labelHeight + this.options.labelPadding;
          const xOffset = x + this.options.labelPadding;
          this.ctx.fillText(label, xOffset, y, this.options.labelProps);
        }
      }
    }
  }

  private drawHorizontalLines(labelMetrics: TextMeasure | null): void {
    const { width, height, spacing, offsetX, offsetY } = this.options;
    const start = offsetY;
    const end = offsetY + height;
    const firstIndex = Math.floor(start / spacing);
    const lastIndex = Math.ceil(end / spacing);

    for (let index = firstIndex; index <= lastIndex; index++) {
      const worldY = index * spacing;
      const y = worldY - offsetY;
      if (y < -EPSILON || y > height + EPSILON) continue;

      const isOrigin = Math.abs(worldY) < EPSILON;
      const isMajor = this.isMajor(worldY);
      const { strokeStyle, lineWidth } = this.getLineStyle(isOrigin, isMajor);

      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, y);
      this.ctx.lineTo(offsetX + width, y);
      this.ctx.setStrokeStyle(strokeStyle);
      this.ctx.setLineWidth(lineWidth);
      this.ctx.closePath();
      this.ctx.stroke();

      if (this.shouldRenderLabel(isOrigin, isMajor)) {
        const label = this.options.labelFormatter(worldY);
        if (label) {
          const labelHeight = labelMetrics?.height ?? this.options.labelFontSize;
          const yOffset = y - this.options.labelPadding;
          const x = offsetX + this.options.labelPadding;
          const adjustedY = yOffset <= offsetY ? y + labelHeight + this.options.labelPadding : yOffset;
          this.ctx.fillText(label, x, adjustedY, this.options.labelProps);
        }
      }
    }
  }

  private shouldRenderLabel(isOrigin: boolean, isMajor: boolean): boolean {
    if (!this.options.showLabels) return false;
    if (isOrigin) return this.options.includeOriginLabels;
    if (this.options.labelMajorLinesOnly) return isMajor;
    return true;
  }

  private getLineStyle(isOrigin: boolean, isMajor: boolean): { strokeStyle: string; lineWidth: number } {
    if (isOrigin) {
      return {
        strokeStyle: this.options.originStrokeStyle,
        lineWidth: this.options.originLineWidth,
      };
    }
    if (isMajor) {
      return {
        strokeStyle: this.options.majorStrokeStyle,
        lineWidth: this.options.majorLineWidth,
      };
    }
    return {
      strokeStyle: this.options.minorStrokeStyle,
      lineWidth: this.options.minorLineWidth,
    };
  }

  private isMajor(position: number): boolean {
    const { majorSpacing } = this.options;
    if (majorSpacing <= 0) return false;
    const ratio = position / majorSpacing;
    return Math.abs(ratio - Math.round(ratio)) < EPSILON;
  }

  private resolveDimension(key: 'width' | 'height'): number {
    const ctxRecord = this.ctx as unknown as Record<string, unknown>;
    const direct = ctxRecord[key];
    if (typeof direct === 'number' && Number.isFinite(direct)) {
      return direct;
    }

    const canvasRecord = ctxRecord.canvas as { width?: number; height?: number } | undefined;
    if (canvasRecord && typeof canvasRecord[key] === 'number') {
      return canvasRecord[key] as number;
    }

    return 0;
  }
}
