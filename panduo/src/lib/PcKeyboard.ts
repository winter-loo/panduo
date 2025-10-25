import { EventEmitter } from 'events';
import { noteCoordinator } from '$lib/note-events/noteCoordinator';
import type { NoteEventData, NoteEventType } from '$lib/note-events/types';

const PC_KEYBOARD_SOURCE_ID = 'pc-keybord';

type HandMode = 'LH' | 'RH' | 'LR';

type NoteInfo = {
  noteName: string;
  holding: boolean;
  octave: number;
};

const RightHandNoteNameMap = new Map<string, NoteInfo>([
  ['KeyN', { noteName: 'C', octave: 4, holding: false }],
  ['KeyI', { noteName: 'D', octave: 4, holding: false }],
  ['KeyO', { noteName: 'E', octave: 4, holding: false }],
  ['KeyP', { noteName: 'F', octave: 4, holding: false }],
  ['BracketLeft', { noteName: 'G', octave: 4, holding: false }],
  ['BracketRight', { noteName: 'A', octave: 4, holding: false }],
  ['Backslash', { noteName: 'B', octave: 4, holding: false }],
  ['KeyJ', { noteName: 'C#', octave: 4, holding: false }],
  ['Digit9', { noteName: 'D#', octave: 4, holding: false }],
  ['Digit0', { noteName: 'F#', octave: 4, holding: false }],
  ['Minus', { noteName: 'G#', octave: 4, holding: false }],
  ['Equal', { noteName: 'A#', octave: 4, holding: false }],
]);

const LeftHandNoteNameMap = new Map<string, NoteInfo>([
  ['KeyQ', { noteName: 'C', octave: 4, holding: false }],
  ['KeyW', { noteName: 'D', octave: 4, holding: false }],
  ['KeyE', { noteName: 'E', octave: 4, holding: false }],
  ['KeyR', { noteName: 'F', octave: 4, holding: false }],
  ['Space', { noteName: 'G', octave: 4, holding: false }],
  ['KeyV', { noteName: 'A', octave: 4, holding: false }],
  ['KeyB', { noteName: 'B', octave: 4, holding: false }],
  ['Digit2', { noteName: 'C#', octave: 4, holding: false }],
  ['Digit3', { noteName: 'D#', octave: 4, holding: false }],
  ['Digit4', { noteName: 'F#', octave: 4, holding: false }],
  ['Digit5', { noteName: 'G#', octave: 4, holding: false }],
  ['KeyC', { noteName: 'A#', octave: 4, holding: false }],
]);

const LeftHandOctaveMap = new Map([
  ['KeyA', { octave: 5, holding: false }],
  ['KeyS', { octave: 6, holding: false }],
  ['KeyD', { octave: 7, holding: false }],
  ['KeyZ', { octave: 3, holding: false }],
  ['KeyX', { octave: 2, holding: false }],
  ['KeyC', { octave: 1, holding: false }],
  ['KeyQ', { octave: 8, holding: false }],
  ['KeyW', { octave: 4, holding: false }],
  ['KeyE', { octave: 0, holding: false }],
]);

const RightHandOctaveMap = new Map([
  ['KeyJ', { octave: 5, holding: false }],
  ['KeyK', { octave: 6, holding: false }],
  ['KeyL', { octave: 7, holding: false }],
  ['KeyN', { octave: 3, holding: false }],
  ['KeyM', { octave: 2, holding: false }],
  ['Comma', { octave: 1, holding: false }],
  ['KeyU', { octave: 8, holding: false }],
  ['KeyI', { octave: 4, holding: false }],
  ['KeyO', { octave: 0, holding: false }],
]);

const LeftRightOctaveMap = new Map([
  ['KeyA', { octave: 5, holding: false }],
  ['KeyS', { octave: 6, holding: false }],
  ['KeyD', { octave: 7, holding: false }],
  ['KeyF', { octave: 8, holding: false }],
  ['KeyM', { octave: 2, holding: false }],
  ['Comma', { octave: 1, holding: false }],
  ['Period', { octave: 0, holding: false }],
  ['KeyU', { octave: 3, holding: false }],
  ['KeyZ', { octave: 4, holding: false }],
]);


// add octave field and merge
const mergeWithOctave = (
  map: Map<string, Omit<NoteInfo, 'octave'>>,
  octave: number
): [string, NoteInfo][] => {
  return Array.from(map.entries()).map(([key, value]) => [
    key,
    { ...value, octave },
  ]);
};


export class PcKeyboard extends EventEmitter {
  private mode = 'RH';
  private noteNameMap = RightHandNoteNameMap;
  private octaveMap = LeftHandOctaveMap;
  // 'A', 'S', 'D' for increment octaves
  // A: C5, S: C6, D: C7
  // 'Z', 'X', 'C' for decrement octaves
  // Z: C3, X: C2, C: C1
  // Q for C8, W for C4, E for C0
  private keydownListener: any;
  private keyupListener: any;

  constructor() {
    super();

    this.keydownListener = null;
    this.keyupListener = null;

    noteCoordinator.registerControl({
      id: PC_KEYBOARD_SOURCE_ID,
      role: 'main',
    });
  }

  setMode(mode: HandMode) {
    if (this.mode != mode) {
      this.mode = mode;
      this.turnOff();
      if (this.mode == 'LH') {
        this.noteNameMap = LeftHandNoteNameMap;
        this.octaveMap = RightHandOctaveMap;
      } else if (this.mode == 'RH') {
        this.noteNameMap = RightHandNoteNameMap;
        this.octaveMap = LeftHandOctaveMap;
      } else {
        this.noteNameMap = new Map<string, NoteInfo>([
          ...mergeWithOctave(LeftHandNoteNameMap, 3),
          ...RightHandNoteNameMap,
        ]);
        this.octaveMap = LeftRightOctaveMap;
      }
      this.turnOn();
    }
  }

  _addListeners() {
    if (typeof document === 'undefined') return;
    this.keydownListener = (event: any) => {
      event.preventDefault();
      let validKeyDown = this.noteNameMap.get(event.code);

      if (validKeyDown != undefined && !validKeyDown.holding) {
        validKeyDown.holding = true;
        let octaveNumberHolding = false;
        this.octaveMap.forEach(({ octave, holding }, _key) => {
          if (holding) {
            octaveNumberHolding = true;
            this.emitNoteEvent('noteon', {
              note: validKeyDown.noteName,
              octave,
              sharp: validKeyDown.noteName.includes('#'),
            });
          }
        });
        if (!octaveNumberHolding) {
          this.emitNoteEvent('noteon', {
            note: validKeyDown.noteName,
            octave: validKeyDown.octave,
            sharp: validKeyDown.noteName.includes('#'),
          });
        }
      } else if (validKeyDown == undefined) {
        let validKeyDown = this.octaveMap.get(event.code);
        if (validKeyDown != undefined && !validKeyDown.holding) {
          validKeyDown.holding = true;
          this.noteNameMap.forEach(({ noteName, holding }, _key) => {
            if (holding) {
              this.emitNoteEvent('noteon', {
                note: noteName,
                octave: validKeyDown.octave,
                sharp: noteName.includes('#'),
              });
            }
          });
        }
      }
    };

    this.keyupListener = (event: any) => {
      let state = this.noteNameMap.get(event.code);
      if (state) {
        state.holding = false;
        let hasOctaveNumberHolding = false;
        this.octaveMap.forEach(({ octave, holding }, _key) => {
          if (holding) {
            hasOctaveNumberHolding = true;
            this.emitNoteEvent('noteoff', {
              note: state.noteName,
              octave,
              sharp: state.noteName.includes('#'),
            });
          }
        });
        if (!hasOctaveNumberHolding) {
          this.emitNoteEvent('noteoff', {
            note: state.noteName,
            octave: state.octave,
            sharp: state.noteName.includes('#'),
          });
        }
      } else {
        let state = this.octaveMap.get(event.code);
        if (state) {
          state.holding = false;
          this.noteNameMap.forEach(({ noteName, holding }, _key) => {
            if (holding) {
              this.emitNoteEvent('noteoff', {
                note: noteName,
                octave: state.octave,
                sharp: noteName.includes('#'),
              });
            }
          });
        }
      }
    };

    document.addEventListener('keydown', this.keydownListener);
    document.addEventListener('keyup', this.keyupListener);

    // Explicit unlock handled via overlay button; no global pointerdown hook needed.
  }

  _removeListeners() {
    if (typeof document === 'undefined') return;
    document.removeEventListener('keydown', this.keydownListener);
    document.removeEventListener('keyup', this.keyupListener);
    // No unlock handler to remove; handled by overlay button
  }

  turnOn() {
    this._addListeners();
  }

  turnOff() {
    this._removeListeners();
  }

  keyboardMap(): Map<string, string> {
    let km = new Map<string, string>();
    this.noteNameMap.forEach(({ noteName }, key) => {
      km.set(key, noteName);
    });
    this.octaveMap.forEach(({ octave }, key) => {
      km.set(key, 'octave ' + octave.toString());
    });
    return km;
  }

  getOctaveKeyMap(): Map<string, number> {
    let m = new Map<string, number>();
    this.octaveMap.forEach(({ octave }, key) => {
      m.set(key, octave);
    });
    return m;
  }

  private emitNoteEvent(type: NoteEventType, data: NoteEventData) {
    if (data.octave == 0 && data.note != 'A' && data.note != 'A#' && data.note != 'B') {
      return;
    }
    if (data.octave == 8 && data.note != 'C') {
      return;
    }
    const payload = {
      ...data,
      sourceId: PC_KEYBOARD_SOURCE_ID,
      sourceRole: 'main' as const,
    };
    if (type === 'noteon') {
      noteCoordinator.emitNoteOn(payload);
    } else {
      noteCoordinator.emitNoteOff(payload);
    }
    // Preserve legacy camelCase events for existing listeners until all consumers migrate.
    this.emit(type === 'noteon' ? 'noteOn' : 'noteOff', data);
    this.emit(type, data);
  }
}

let pcKeyboard: PcKeyboard;

export function getPcKeyboard(): PcKeyboard {
  if (!pcKeyboard) {
    pcKeyboard = new PcKeyboard();
  }
  return pcKeyboard;
}
