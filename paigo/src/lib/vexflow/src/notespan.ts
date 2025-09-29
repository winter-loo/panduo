// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { BoundingBox } from './boundingbox';
import { VexflowConfigInstance } from './config';
import { Element } from './element';
import { RenderContext } from './rendercontext';
import { Category } from './typeguard';
import { log } from './util';

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

  private dom?: Element;
  private bounds: SpanBounds = { x: 0, y: 0, width: 0, height: 0 };
  private staffLineWidth: number = 0;
  private innerWidth: number = 0;
  private expanded: boolean = false;
  private visible: boolean = false;

  constructor(config: VexflowConfigInstance) {
    super(config);
    this.metricsValid = true;
  }

  getDom(): Element | undefined {
    return this.dom;
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(): this {
    this.visible = true;
    return this;
  }

  hide(): this {
    this.visible = false;
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
    this.innerWidth = 0;
    this.expanded = false;
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
    this.dom = ctx.openGroup('notespan', this.getAttribute('id'));

    this.drawSpan(ctx);
    ctx.closeGroup();
  }

  private drawSpan(ctx: RenderContext): void {
    const { x, y, width, height } = this.bounds;
    const slw = this.staffLineWidth || this.config.get('Stave.style.lineWidth');

    ctx.openGroup('span');
    ctx.fillRect(x, y, this.innerWidth, height, {
      class: 'inner',
      rx: height / 2,
      ry: height / 2,
      opacity: 0.5,
    });

    const halfStroke = slw / 2;
    const outerWidth = Math.max(0, width - slw);
    const outerHeight = Math.max(0, height + slw * 3);

    ctx.rect(x - slw * 2 + halfStroke, y - slw * 2 + halfStroke, outerWidth, outerHeight, {
      rx: outerHeight / 2,
      ry: outerHeight / 2,
      fill: 'none',
      'stroke-width': slw,
      stroke: 'currentColor',
      opacity: 0.3,
    });
    ctx.closeGroup();
  }

  expandToDelta(delta: number, timestamp?: DOMHighResTimeStamp): boolean {
    if (!this.dom || !this.visible) return true;
    if (this.expanded) return true;

    const slw = this.staffLineWidth || this.config.get('Stave.style.lineWidth');
    const maxInnerWidth = Math.max(0, this.bounds.width - slw * 4);
    const minInnerWidth = Math.max(0, this.bounds.height - 4);

    const nextWidth = Math.min(this.innerWidth + delta, maxInnerWidth);
    this.innerWidth = Math.max(nextWidth, minInnerWidth);

    if (this.innerWidth >= maxInnerWidth) {
      this.expanded = true;
      L('NoteSpan fully expanded', timestamp, this.innerWidth);
    }

    const rect = this.dom.querySelector('.span .inner') as SVGRectElement | null;
    rect?.setAttribute('width', `${this.innerWidth}`);

    // Retain legacy behaviour: caller keeps animating even after expansion.
    return false;
  }
}
