// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { BoundingBox } from './boundingbox';
import { VexflowConfigInstance } from './config';
import { Element } from './element';
import { RenderContext } from './rendercontext';
import { Category } from './typeguard';
import type { Tickable } from './tickable';
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
  private animationStartTimestamp: number | null = null;
  private animationLastTimestamp: number | null = null;
  private boundNote?: Tickable;
  private outerMode: 'full' | 'inner' | 'halo' = 'full';
  private outerModeTimers: number[] = [];
  private noteHeadWidth: number = 0;
  private noteHeadHeight: number = 0;

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
    this.resetOuterMode();
    this.updateDomVisibility();
    this.updateDomDimensions();
    this.startExpandAnimation();
    return this;
  }

  hide(): this {
    this.visible = false;
    this.cancelAnimation();
    this.clearOuterModeTimers();
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

  setNoteHeadSize(width: number, height: number): this {
    this.noteHeadWidth = Math.max(0, width);
    this.noteHeadHeight = Math.max(0, height);
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

    const headWidth = this.noteHeadWidth > 0 ? this.noteHeadWidth : this.getMinInnerWidth();
    const headHeight = this.noteHeadHeight > 0 ? this.noteHeadHeight : this.bounds.height;

    const innerRect = group.querySelector(`.${cp('span')} .inner`) as SVGRectElement | null;
    if (innerRect) {
      innerRect.setAttribute('width', `${innerWidth}`);
      innerRect.setAttribute('height', `${headHeight}`);
      innerRect.setAttribute('rx', `${headHeight / 2}`);
      innerRect.setAttribute('ry', `${headHeight / 2}`);
    }

    const outerRect = group.querySelector(`.${cp('span')} .outer`) as SVGRectElement | null;
    if (outerRect) {
      const { x, y, height } = this.bounds;
      const slw = this.staffLineWidth || this.config.get('Stave.style.lineWidth');
      const halfStroke = slw / 2;
      const fullWidth = this.getFullOuterWidth();
      const fullHeight = Math.max(0, height + slw * 3);
      const fullX = x - slw * 2 + halfStroke;
      const fullY = y - slw * 2 + halfStroke;
      const fullRadius = fullHeight / 2;

      if (this.outerMode === 'inner') {
        outerRect.setAttribute('x', `${x}`);
        outerRect.setAttribute('y', `${y}`);
        outerRect.setAttribute('width', `${headWidth}`);
        outerRect.setAttribute('height', `${headHeight}`);
        outerRect.setAttribute('rx', `${headHeight / 2}`);
        outerRect.setAttribute('ry', `${headHeight / 2}`);
        outerRect.removeAttribute('display');
      } else if (this.outerMode === 'halo') {
        const haloWidth = headWidth + slw * 2;
        const haloHeight = headHeight + slw * 2;
        const haloX = x - slw;
        const haloY = y - slw;
        outerRect.setAttribute('x', `${haloX}`);
        outerRect.setAttribute('y', `${haloY}`);
        outerRect.setAttribute('width', `${haloWidth}`);
        outerRect.setAttribute('height', `${haloHeight}`);
        outerRect.setAttribute('rx', `${haloHeight / 2}`);
        outerRect.setAttribute('ry', `${haloHeight / 2}`);
        outerRect.removeAttribute('display');
      } else {
        outerRect.setAttribute('x', `${fullX}`);
        outerRect.setAttribute('y', `${fullY}`);
        outerRect.setAttribute('width', `${fullWidth}`);
        outerRect.setAttribute('height', `${fullHeight}`);
        outerRect.setAttribute('rx', `${fullRadius}`);
        outerRect.setAttribute('ry', `${fullRadius}`);
        outerRect.removeAttribute('display');
      }
    }
  }

  private drawSpan(ctx: RenderContext): void {
    const { x, y, width, height } = this.bounds;
    const slw = this.staffLineWidth || this.config.get('Stave.style.lineWidth');
    const headWidth = this.noteHeadWidth > 0 ? this.noteHeadWidth : this.getMinInnerWidth();
    const headHeight = this.noteHeadHeight > 0 ? this.noteHeadHeight : height;

    ctx.openGroup('span');
    const innerWidth = this.getEffectiveInnerWidth();
    const innerRx = headHeight / 2;
    ctx.fillRect(x, y, headWidth, headHeight, {
      class: 'inner',
      rx: innerRx,
      ry: innerRx,
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
    if (this.noteHeadWidth > 0) return this.noteHeadWidth;
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

  bindToNote(note: Tickable): this {
    this.boundNote = note;
    return this;
  }

  private getTempoSpeed(): number {
    const configuredSpeed = this.config.get('tempoSpeed', 0);
    return Number.isFinite(configuredSpeed) && configuredSpeed > 0 ? configuredSpeed : 0;
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
    this.animationStartTimestamp = null;
    this.animationLastTimestamp = null;
  }

  private clearOuterModeTimers(): void {
    if (typeof window === 'undefined') {
      this.outerModeTimers = [];
      return;
    }
    this.outerModeTimers.forEach((timer) => window.clearTimeout(timer));
    this.outerModeTimers = [];
  }

  setOuterMode(mode: 'full' | 'inner' | 'halo'): this {
    if (this.outerMode === mode) return this;
    this.outerMode = mode;
    this.updateDomDimensions();
    return this;
  }

  snapInnerWidthToMinimum(): this {
    this.cancelAnimation();
    this.innerWidth = this.getMinInnerWidth();
    this.expanded = false;
    this.updateDomDimensions();
    return this;
  }

  resetOuterMode(): this {
    this.clearOuterModeTimers();
    this.outerMode = 'full';
    this.updateDomDimensions();
    return this;
  }

  startHaloPulseAnimation(expandDelayMs: number, holdDurationMs: number): this {
    this.clearOuterModeTimers();
    this.snapInnerWidthToMinimum();
    this.setOuterMode('inner');

    if (typeof window === 'undefined') {
      this.setOuterMode('halo');
      this.setOuterMode('inner');
      return this;
    }

    const expandTimer = window.setTimeout(() => {
      this.setOuterMode('halo');
    }, Math.max(0, expandDelayMs));

    const collapseTimer = window.setTimeout(() => {
      this.setOuterMode('inner');
    }, Math.max(0, expandDelayMs + holdDurationMs));

    this.outerModeTimers.push(expandTimer, collapseTimer);
    return this;
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

    const speedPerMs = this.getTempoSpeed();
    if (speedPerMs <= 0) {
      this.innerWidth = maxInner;
      this.expanded = true;
      this.updateDomDimensions();
      return;
    }

    const animate = (timestamp: DOMHighResTimeStamp) => {
      if (!this.visible) {
        this.cancelAnimation();
        return;
      }

      if (this.animationStartTimestamp === null) {
        this.animationStartTimestamp = timestamp;
      }

      if (this.animationLastTimestamp === null) {
        this.animationLastTimestamp = timestamp;
        this.animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      const totalElapsed = timestamp - this.animationStartTimestamp;
      const traveledDistance = totalElapsed * speedPerMs;

      const cursorWidth = this.config.get('Stem.width');
      const staveLineWidth = this.config.get('Stave.style.lineWidth');
      const extra = cursorWidth + staveLineWidth;
      // delay expansion until specified width has passed
      if (traveledDistance + extra < minInner) {
        this.animationLastTimestamp = timestamp;
        this.animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      const expansionDistance = traveledDistance + extra - minInner;
      const nextWidth = Math.min(maxInner, minInner + expansionDistance);

      if (nextWidth <= this.innerWidth) {
        this.animationLastTimestamp = timestamp;
        this.animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      this.innerWidth = nextWidth;
      this.updateDomDimensions();

      if (nextWidth >= maxInner) {
        this.expanded = true;
        this.cancelAnimation();
        return;
      }

      this.animationLastTimestamp = timestamp;
      this.animationFrame = window.requestAnimationFrame(animate);
    };

    this.animationStartTimestamp = null;
    this.animationLastTimestamp = null;
    this.animationFrame = window.requestAnimationFrame(animate);
  }
}
