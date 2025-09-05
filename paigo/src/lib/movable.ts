export class MovableElement {
  elementOffsetX: number;
  animationId?: number;
  maxOffsetX: number;

  constructor(maxOffsetX: number) {
    this.elementOffsetX = 0;
    this.maxOffsetX = maxOffsetX;
  }

  // see https://svelte.dev/docs/svelte/$state#Classes for the reason for
  // the style of this function definition.
  move = () => {
    const animate = () => {
      this.elementOffsetX += 1;
      if (this.elementOffsetX > this.maxOffsetX) {
        cancelAnimationFrame(this.animationId!);
        return;
      }
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  };

  // see https://svelte.dev/docs/svelte/$state#Classes for the reason for
  // the style of this function definition.
  stop = () => {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  };

  // see https://svelte.dev/docs/svelte/$state#Classes for the reason for
  // the style of this function definition.
  reset = () => {
    this.elementOffsetX = 0;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  };

  attachment = (element: HTMLElement) => {
    let isDragging = false;
    let dragStartX = 0;
    let containerStartX = 0;

    const onDragStart = (e: MouseEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      containerStartX = this.elementOffsetX;
    };

    const onDragging = (e: MouseEvent) => {
      if (isDragging) {
        // > 0 => moving right
        // < 0 => moving left
        let deltaX = e.clientX - dragStartX;
        if (Math.abs(deltaX) > 2) {
          const newX = Math.max(containerStartX - deltaX, 0);
          this.elementOffsetX = newX;
        }
      }
    };

    const onDragStop = (_e: MouseEvent) => {
      isDragging = false;
    };

    element.addEventListener('mousedown', onDragStart);
    element.addEventListener('mouseup', onDragStop);
    element.addEventListener('mousemove', onDragging);

    return () => {
      element.removeEventListener('mousedown', onDragStart);
      element.removeEventListener('mouseup', onDragStop);
      element.removeEventListener('mousemove', onDragging);
    };
  };
}

