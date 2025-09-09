import { draggable, Compartment, position, axis, unstable_definePlugin, touchAction } from '@neodrag/svelte';
import type { Attachment } from 'svelte/attachments';

export class MovableElement {
  maxOffsetX: number;
  // the distance of leftward move, positive value
  currentOffsetX: number;
  moveAnimationId: number | null;
  currentPosComp: any;
  clampPlugin: any;

  constructor(maxOffsetX: number) {
    this.maxOffsetX = maxOffsetX;
    this.currentOffsetX = 0;
    this.moveAnimationId = 0;
    // position() plugin controls the element's translate when NOT actively dragging.
    // We wrap it in a Compartment so we can change the current position reactively
    // from imperative methods like move()/reset().
    this.currentPosComp = Compartment.of(() => position({ current: { x: this.currentOffsetX, y: 0 } }));
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
      }
    }));
    this.clampPlugin = clampX();
  }

  draggable = (): Attachment<HTMLElement> => {
    // Compose neodrag plugins (see next.neodrag.dev docs):
    // - axis('x'): constrain movement to horizontal.
    // - clampPlugin: clamp X to [-maxOffsetX, 0] using ctx.propose(), no snap-forward.
    // - touchAction('pan-y'): allow vertical page scroll on touch devices.
    // - position(...): used for programmatic moves (move/reset) via Compartment.
    return draggable(() => [axis('x'), this.clampPlugin, touchAction('pan-y'), this.currentPosComp]);
  }

  move = () => {
    const moveLeft = () => {
      this.currentOffsetX = Math.min(this.currentOffsetX + 1, this.maxOffsetX);
      this.currentPosComp.current = position({
        current: { x: -this.currentOffsetX, y: 0 }
      });
      if (this.currentOffsetX != this.maxOffsetX) {
        this.moveAnimationId = requestAnimationFrame(moveLeft);
      }
    }
    if (!this.moveAnimationId) moveLeft();
  }

  stop = () => {
    if (this.moveAnimationId) {
      cancelAnimationFrame(this.moveAnimationId);
      this.moveAnimationId = null;
    }
  }

  reset = () => {
    this.stop();
    this.currentOffsetX = 0;
    this.currentPosComp.current = position({
      current: { x: this.currentOffsetX, y: 0 }
    });
  }
}
