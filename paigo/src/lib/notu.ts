export type BaseNoteValue = 1 | 2 | 4 | 8 | 16 | 32;
export class NoteDuration {
  baseNoteValue: BaseNoteValue;
  multiplier: 1 | 3;

  constructor(baseNoteValue: BaseNoteValue, repeat: 1 | 3 = 1) {
    this.baseNoteValue = baseNoteValue;
    this.multiplier = repeat;
  }
  toString(): string {
    return `${this.multiplier}/${this.baseNoteValue}`;
  }
}
export class RestDuration extends NoteDuration {
  constructor(baseNoteValue: BaseNoteValue, repeat: 1 | 3 = 1) {
    super(baseNoteValue, repeat);
  }
}

export function rest(baseNoteValue: BaseNoteValue, repeat: 1 | 3 = 1): RestDuration {
  return new RestDuration(baseNoteValue, repeat);
}

export function notu(baseNoteValue: BaseNoteValue, repeat: 1 | 3 = 1): NoteDuration {
  return new NoteDuration(baseNoteValue, repeat);
}

export interface LayoutBase {
  measureWidth: number;
  barLineWidth: number;
  notesSpacing: number;
}

// 1 2 4 8 16 32
// 3/4 3/8 3/16 3/32
export function noteWidth(layoutBase: LayoutBase, notu: NoteDuration): number {
  return (
    (notu.multiplier * (layoutBase.measureWidth + layoutBase.barLineWidth)) / notu.baseNoteValue -
    layoutBase.notesSpacing
  );
}
