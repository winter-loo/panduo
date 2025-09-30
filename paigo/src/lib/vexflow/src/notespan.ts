// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { BoundingBox } from './boundingbox';
import { VexflowConfigInstance } from './config';
import { Element } from './element';
import { RenderContext } from './rendercontext';
import { Category } from './typeguard';
import { log, prefix as cp } from './util';

// eslint-disable-next-line
function L(...args: any[]) {
  if (NoteSpan.DEBUG) log('VexFlow.NoteSpan', args);
}

interface SpanBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class NoteSpan extends Element {
  static DEBUG: boolean = false;

  static override get CATEGORY(): string {
    return Category.NoteSpan;
  }

  private dom?: SVGGElement;
  private bounds: SpanBounds = { x: 0, y: 0, width: 0, height: 0 };
  private staffLineWidth: number = 0;
  private innerWidth: number = 0;
  private expanded: boolean = false;
  private visible: boolean = false;
  private animationFrame: number | null = null;
  private animationStart: number | null = null;
  private readonly animationDurationMs: number = 250;

  constructor(config: VexflowConfigInstance) {
    super(config);
    this.metricsValid = true;
  }

  getDom(): SVGGElement | undefined {
    return this.dom;
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(): this {
    this.visible = true;
    if (this.innerWidth <= 0) {
      this.innerWidth = this.getMinInnerWidth();
    }
    this.expanded = false;
    this.updateDomVisibility();
    this.updateDomDimensions();
    this.startExpandAnimation();
    return this;
  }

  hide(): this {
    this.visible = false;
    this.cancelAnimation();
    this.updateDomVisibility();
    return this;
  }

  setGeometry(x: number, y: number, width: number, height: number, staffLineWidth: number): this {
    const hasWidthChange = Math.abs(this.bounds.width - width) > 0.0001;
    this.bounds = { x, y, width, height };
    this.staffLineWidth = staffLineWidth;
    this._width = width;
    this._height = height;

    if (hasWidthChange) {
      this.resetAnimation();
    }
    return this;
  }

  resetAnimation(): this {
    this.cancelAnimation();
    this.innerWidth = 0;
    this.expanded = false;
    this.updateDomDimensions();
    if (this.visible && this.dom) {
      this.startExpandAnimation();
    }
    return this;
  }

  override getBoundingBox(): BoundingBox {
    const { x, y, width, height } = this.bounds;
    return new BoundingBox(x, y, width, height);
  }

  override draw(): void {
    if (!this.visible) return;
    const ctx = this.checkContext();
    this.setRendered();
    this.dom = ctx.openGroup('notespan', this.getAttribute('id')) as SVGGElement;

    this.drawSpan(ctx);
    ctx.closeGroup();
    this.updateDomVisibility();
    this.updateDomDimensions();
    if (this.visible) {
      this.startExpandAnimation();
    }
  }

  private updateDomVisibility(): void {
    const group = this.dom;
    if (!group) return;

    if (this.visible) {
      group.removeAttribute('display');
      group.removeAttribute('aria-hidden');
    } else {
      group.setAttribute('display', 'none');
      group.setAttribute('aria-hidden', 'true');
    }
  }

  private updateDomDimensions(): void {
    const group = this.dom;
    if (!group) return;

    const innerWidth = this.getEffectiveInnerWidth();

    const innerRect = group.querySelector(`.${cp('span')} .inner`) as SVGRectElement | null;
    if (innerRect) {
      innerRect.setAttribute('width', `${innerWidth}`);
    }

    const outerRect = group.querySelector(`.${cp('span')} .outer`) as SVGRectElement | null;
    if (outerRect) {
      const outerWidth = this.getFullOuterWidth();
      if (outerWidth > 0) {
        outerRect.setAttribute('width', `${outerWidth}`);
        outerRect.removeAttribute('display');
      } else {
        outerRect.setAttribute('width', '0');
        outerRect.setAttribute('display', 'none');
      }
    }
  }

  private drawSpan(ctx: RenderContext): void {
    const { x, y, width, height } = this.bounds;
    const slw = this.staffLineWidth || this.config.get('Stave.style.lineWidth');

    ctx.openGroup('span');
    const innerWidth = this.getEffectiveInnerWidth();
    ctx.fillRect(x, y, innerWidth, height, {
      class: 'inner',
      rx: height / 2,
      ry: height / 2,
      opacity: 0.5,
    });

    const halfStroke = slw / 2;
    const outerHeight = Math.max(0, height + slw * 3);
    const outerWidth = this.getFullOuterWidth();

    ctx.rect(x - slw * 2 + halfStroke, y - slw * 2 + halfStroke, outerWidth, outerHeight, {
      class: 'outer',
      rx: outerHeight / 2,
      ry: outerHeight / 2,
      fill: 'none',
      'stroke-width': slw,
      stroke: 'currentColor',
      opacity: 0.3,
      display: outerWidth > 0 ? undefined : 'none',
    });
    ctx.closeGroup();
  }

  private getMaxInnerWidth(): number {
    const slw = this.staffLineWidth || this.config.get('Stave.style.lineWidth');
    const { width } = this.bounds;
    const maxInnerWidth = Math.max(1e-6, width - slw * 4);
    return maxInnerWidth;
  }

  private getMinInnerWidth(): number {
    const { height } = this.bounds;
    return Math.max(0, height - 4);
  }

  private getEffectiveInnerWidth(): number {
    const maxInner = this.getMaxInnerWidth();
    const minInner = this.getMinInnerWidth();
    if (this.innerWidth > 0) {
      return Math.max(minInner, Math.min(this.innerWidth, maxInner));
    }
    return minInner;
  }

  private getFullOuterWidth(): number {
    const slw = this.staffLineWidth || this.config.get('Stave.style.lineWidth');
    const { width } = this.bounds;
    return Math.max(0, width - slw);
  }

  expandToDelta(delta: number, timestamp?: DOMHighResTimeStamp): boolean {
    if (!this.dom || !this.visible) return true;
    if (this.expanded) return true;

    const slw = this.staffLineWidth || this.config.get('Stave.style.lineWidth');
    const maxInnerWidth = this.getMaxInnerWidth();
    const minInnerWidth = this.getMinInnerWidth();

    const nextWidth = Math.min(this.innerWidth + delta, maxInnerWidth);
    this.innerWidth = Math.max(nextWidth, minInnerWidth);

    if (this.innerWidth >= maxInnerWidth) {
      this.expanded = true;
      L('NoteSpan fully expanded', timestamp, this.innerWidth);
    }

    this.updateDomDimensions();

    // Retain legacy behaviour: caller keeps animating even after expansion.
    return false;
  }

  private cancelAnimation(): void {
    if (this.animationFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrame);
    }
    this.animationFrame = null;
    this.animationStart = null;
  }

  private startExpandAnimation(): void {
    if (!this.visible || this.expanded) return;
    if (!this.dom) return;
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      this.innerWidth = this.getMaxInnerWidth();
      this.expanded = true;
      this.updateDomDimensions();
      return;
    }

    this.cancelAnimation();

    const minInner = this.getMinInnerWidth();
    const maxInner = this.getMaxInnerWidth();
    if (maxInner <= minInner) {
      this.innerWidth = maxInner;
      this.expanded = true;
      this.updateDomDimensions();
      return;
    }

    this.innerWidth = minInner;
    this.updateDomDimensions();

    const animate = (timestamp: DOMHighResTimeStamp) => {
      if (!this.visible) {
        this.cancelAnimation();
        return;
      }

      if (this.animationStart === null) {
        this.animationStart = timestamp;
      }

      const elapsed = timestamp - this.animationStart;
      const progress = Math.min(1, elapsed / this.animationDurationMs);
      const nextWidth = minInner + (maxInner - minInner) * progress;
      this.innerWidth = nextWidth;
      this.updateDomDimensions();

      if (progress < 1) {
        this.animationFrame = window.requestAnimationFrame(animate);
      } else {
        this.expanded = true;
        this.cancelAnimation();
      }
    };

    this.animationFrame = window.requestAnimationFrame(animate);
  }
}
