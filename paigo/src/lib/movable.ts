import { draggable, bounds, BoundsFrom, events, Compartment, position } from '@neodrag/svelte';
import type { Attachment } from 'svelte/attachments';

export class MovableElement {
  maxOffsetX: number;
  // the distance of leftward move, positive value
  currentOffsetX: number;
  moveAnimationId: number | null;
  currentPosComp: any;

  constructor(maxOffsetX: number) {
    this.maxOffsetX = maxOffsetX;
    this.currentOffsetX = 0;
    this.moveAnimationId = 0;
    this.currentPosComp = Compartment.of(() => position({ current: { x: this.currentOffsetX, y: 0 } }));
  }

  draggable = (): Attachment<HTMLElement> => {
    // Reactive compartments for changing values
    const eventHandlers = events({
      onDrag: (e) => {
        this.currentOffsetX = -e.offset.x;
      },
    });
    return draggable(() => [
      bounds(BoundsFrom.parent({ left: -this.maxOffsetX, right: 0 })),
      this.currentPosComp,
      eventHandlers,
    ]);
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
