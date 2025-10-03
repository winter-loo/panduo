import {
  draggable,
  Compartment,
  position,
  axis,
  unstable_definePlugin,
  touchAction,
  events,
} from '@neodrag/svelte';
import type { Attachment } from 'svelte/attachments';

export class MovableElement {
  maxOffsetX: number;
  // the distance of leftward move, positive value
  currentOffsetX: number;
  moveAnimationId: number | null;
  currentPosComp: any;
  clampPlugin: any;
  protected getPixelsPerSecond?: () => number;
  private lastFrameTime?: number;
  onMove?: (offsetX: number) => void; // positive leftward distance
  onDragStart?: () => void;
  onDragEnd?: () => void;

  constructor(maxOffsetX: number, getPixelsPerSecond?: () => number) {
    this.maxOffsetX = maxOffsetX;
    this.currentOffsetX = 0;
    this.moveAnimationId = null;
    this.getPixelsPerSecond = getPixelsPerSecond;
    // position() plugin controls the element's translate when NOT actively dragging.
    // We wrap it in a Compartment so we can change the current position reactively
    // from imperative methods like move()/reset().
    this.currentPosComp = Compartment.of(() =>
      position({ current: { x: this.currentOffsetX, y: 0 } }),
    );
    // Define a custom clamp plugin using neodrag's plugin API.
    // Docs: @neodrag/svelte exports from @neodrag/core/plugins (see axis, position,
    // touchAction, and unstable_definePlugin). The plugin `drag` hook receives a
    // context with:
    // - ctx.offset: current translate applied to the node (before this frame)
    // - ctx.proposed: the delta this frame wants to apply (can be null per-axis)
    // - ctx.propose(x, y): override the delta to enforce constraints
    //
    // We clamp the absolute X offset to [-maxOffsetX, 0]. If a rightward move
    // would exceed 0, we propose a zero delta (no movement), so there's no snap.
    const clampX = unstable_definePlugin(() => ({
      name: 'app:clamp-x',
      drag: (ctx) => {
        const proposed = ctx.offset.x + (ctx.proposed.x ?? 0);
        const min = -this.maxOffsetX;
        const max = 0;
        const clamped = Math.min(max, Math.max(min, proposed));
        const delta = clamped - ctx.offset.x;
        ctx.propose(ctx.proposed.x !== null ? delta : null, null);
        const nextOffsetX = -(ctx.offset.x + delta);
        // Keep internal offset in sync with drag so consumers can read it immediately.
        if (Number.isFinite(nextOffsetX)) {
          this.currentOffsetX = nextOffsetX;
          this.onMove?.(nextOffsetX);
        }
      },
    }));
    this.clampPlugin = clampX();
  }

  draggable = (): Attachment<HTMLElement> => {
    // Compose with neodrag's events plugin to surface drag start/end.
    return draggable(() => [
      axis('x'),
      this.clampPlugin,
      touchAction('pan-y'),
      events({
        onDragStart: () => this.onDragStart?.(),
        onDragEnd: () => this.onDragEnd?.(),
      }),
      this.currentPosComp,
    ]);
  };

  move = () => {
    if (this.moveAnimationId) return;

    const moveLeft = (timestamp: number) => {
      if (this.lastFrameTime === undefined) {
        this.lastFrameTime = timestamp;
      }

      const deltaMs = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;

      const pixelsPerSecond = this.getPixelsPerSecond ? this.getPixelsPerSecond() : 60;
      if (!Number.isFinite(pixelsPerSecond) || pixelsPerSecond <= 0) {
        this.moveAnimationId = null;
        this.lastFrameTime = undefined;
        return;
      }
      const step = (pixelsPerSecond * deltaMs) / 1000;
      this.currentOffsetX = Math.min(this.currentOffsetX + step, this.maxOffsetX);
      this.currentPosComp.current = position({
        current: { x: -this.currentOffsetX, y: 0 },
      });
      this.onMove?.(this.currentOffsetX);
      if (this.currentOffsetX < this.maxOffsetX) {
        this.moveAnimationId = requestAnimationFrame(moveLeft);
      } else {
        this.moveAnimationId = null;
        this.lastFrameTime = undefined;
      }
    };

    this.moveAnimationId = requestAnimationFrame(moveLeft);
  };

  stop = () => {
    if (this.moveAnimationId) {
      cancelAnimationFrame(this.moveAnimationId);
      this.moveAnimationId = null;
    }
    this.lastFrameTime = undefined;
  };

  // Use class field syntax so callbacks like `onclick={movable.reset}` keep
  // the MovableElement instance as `this` without extra binding.
  reset = () => {
    this.stop();
    this.onReset();
  };

  protected onReset(): void {
    this.currentOffsetX = 0;
    this.currentPosComp.current = position({
      current: { x: this.currentOffsetX, y: 0 },
    });
    this.onMove?.(this.currentOffsetX);
  }

  // Nudge left by a positive pixel distance (immediate), respecting bounds.
  nudgeBy = (distancePx: number) => {
    if (!Number.isFinite(distancePx)) return;
    const next = Math.min(
      this.maxOffsetX,
      Math.max(0, this.currentOffsetX + Math.max(0, distancePx)),
    );
    this.currentOffsetX = next;
    this.currentPosComp.current = position({ current: { x: -this.currentOffsetX, y: 0 } });
    this.onMove?.(this.currentOffsetX);
  };

  // Animate to a target offset (absolute, 0..maxOffsetX)
  moveTo = (targetOffsetX: number, durationMs = 220, useEasing = true) => {
    const end = Math.min(this.maxOffsetX, Math.max(0, targetOffsetX));
    const start = this.currentOffsetX;
    const delta = end - start;
    if (Math.abs(delta) < 0.5) {
      this.nudgeBy(end - start);
      return;
    }
    // cancel any existing animation
    this.stop();
    const t0 = performance.now();
    const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    const step = () => {
      const now = performance.now();
      const p = Math.min(1, (now - t0) / durationMs);
      const e = useEasing ? easeInOutQuad(p) : p;
      this.currentOffsetX = start + delta * e;
      this.currentPosComp.current = position({ current: { x: -this.currentOffsetX, y: 0 } });
      this.onMove?.(this.currentOffsetX);
      if (p < 1) {
        this.moveAnimationId = requestAnimationFrame(step);
      } else {
        this.moveAnimationId = null;
        this.currentOffsetX = end;
        this.currentPosComp.current = position({ current: { x: -this.currentOffsetX, y: 0 } });
        this.onMove?.(this.currentOffsetX);
      }
    };
    this.moveAnimationId = requestAnimationFrame(step);
  };

  // Animate a leftward nudge by the given distance (positive), respecting bounds.
  nudgeByAnimated = (distancePx: number, durationMs = 220) => {
    if (!Number.isFinite(distancePx)) return;
    const target = Math.min(
      this.maxOffsetX,
      Math.max(0, this.currentOffsetX + Math.max(0, distancePx)),
    );
    this.moveTo(target, durationMs);
  };

  // Adjust by a signed distance: positive moves left, negative moves right.
  adjustBy = (distancePx: number) => {
    if (!Number.isFinite(distancePx)) return;
    const target = Math.min(this.maxOffsetX, Math.max(0, this.currentOffsetX + distancePx));
    this.currentOffsetX = target;
    this.currentPosComp.current = position({ current: { x: -this.currentOffsetX, y: 0 } });
  };

  // Animated version of adjustBy: positive moves left, negative moves right.
  adjustByAnimated = (distancePx: number, durationMs = 220) => {
    if (!Number.isFinite(distancePx)) return;
    const target = Math.min(this.maxOffsetX, Math.max(0, this.currentOffsetX + distancePx));
    this.moveTo(target, durationMs);
  };
}
