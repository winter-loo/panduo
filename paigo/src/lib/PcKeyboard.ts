import { EventEmitter } from 'events';
import { noteCoordinator } from '$lib/note-events/noteCoordinator';
import type { NoteEventData, NoteEventType } from '$lib/note-events/types';

const PC_KEYBOARD_SOURCE_ID = 'pc-keybord';

export class PcKeyboard extends EventEmitter {
  private NoteNameMap = new Map([
    ['KeyN', { noteName: 'C', holding: false }],
    ['KeyI', { noteName: 'D', holding: false }],
    ['KeyO', { noteName: 'E', holding: false }],
    ['KeyP', { noteName: 'F', holding: false }],
    ['BracketLeft', { noteName: 'G', holding: false }],
    ['BracketRight', { noteName: 'A', holding: false }],
    ['Backslash', { noteName: 'B', holding: false }],
    ['KeyJ', { noteName: 'C#', holding: false }],
    ['Digit9', { noteName: 'D#', holding: false }],
    ['Digit0', { noteName: 'F#', holding: false }],
    ['Minus', { noteName: 'G#', holding: false }],
    ['Equal', { noteName: 'A#', holding: false }],
  ]);

  private LeftHandNoteNameMap = new Map([
    ['KeyQ', { noteName: 'C', holding: false }],
    ['KeyW', { noteName: 'D', holding: false }],
    ['KeyE', { noteName: 'E', holding: false }],
    ['KeyR', { noteName: 'F', holding: false }],
    ['Space', { noteName: 'G', holding: false }],
    ['KeyB', { noteName: 'A', holding: false }],
    ['KeyN', { noteName: 'B', holding: false }],
    ['Digit2', { noteName: 'C#', holding: false }],
    ['Digit3', { noteName: 'D#', holding: false }],
    ['Digit5', { noteName: 'F#', holding: false }],
    ['KeyV', { noteName: 'G#', holding: false }],
    ['KeyH', { noteName: 'A#', holding: false }],
  ]);
  // 'A', 'S', 'D' for increment octaves
  // A: C5, S: C6, D: C7
  // 'Z', 'X', 'C' for decrement octaves
  // Z: C3, X: C2, C: C1
  // Q for C8, W for C4, E for C0
  private OctaveNumberMap = new Map([
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

  _addListeners() {
    if (typeof document === 'undefined') return;
    let self = this;
    this.keydownListener = function (event: any) {
      event.preventDefault();
      let validKeyDown = self.NoteNameMap.get(event.code);

      if (validKeyDown != undefined && !validKeyDown.holding) {
        validKeyDown.holding = true;
        let octaveNumberHolding = false;
        self.OctaveNumberMap.forEach(({ octave, holding }, _key) => {
          if (holding) {
            octaveNumberHolding = true;
            self.emitNoteEvent('noteon', {
              note: validKeyDown.noteName,
              octave,
              sharp: validKeyDown.noteName.includes('#'),
            });
          }
        });
        if (!octaveNumberHolding) {
          self.emitNoteEvent('noteon', {
            note: validKeyDown.noteName,
            octave: 4,
            sharp: validKeyDown.noteName.includes('#'),
          });
        }
      } else if (validKeyDown == undefined) {
        let validKeyDown = self.OctaveNumberMap.get(event.code);
        if (validKeyDown != undefined && !validKeyDown.holding) {
          validKeyDown.holding = true;
          self.NoteNameMap.forEach(({ noteName, holding }, _key) => {
            if (holding) {
              self.emitNoteEvent('noteon', {
                note: noteName,
                octave: validKeyDown.octave,
                sharp: noteName.includes('#'),
              });
            }
          });
        }
      }
    };

    this.keyupListener = function (event: any) {
      let state = self.NoteNameMap.get(event.code);
      if (state) {
        state.holding = false;
        let hasOctaveNumberHolding = false;
        self.OctaveNumberMap.forEach(({ octave, holding }, _key) => {
          if (holding) {
            hasOctaveNumberHolding = true;
            self.emitNoteEvent('noteoff', {
              note: state.noteName,
              octave,
              sharp: state.noteName.includes('#'),
            });
          }
        });
        if (!hasOctaveNumberHolding) {
          self.emitNoteEvent('noteoff', {
            note: state.noteName,
            octave: 4,
            sharp: state.noteName.includes('#'),
          });
        }
      } else {
        let state = self.OctaveNumberMap.get(event.code);
        if (state) {
          state.holding = false;
          self.NoteNameMap.forEach(({ noteName, holding }, _key) => {
            if (holding) {
              self.emitNoteEvent('noteoff', {
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
    this.NoteNameMap.forEach(({ noteName }, key) => {
      km.set(key, noteName);
    });
    this.OctaveNumberMap.forEach(({ octave }, key) => {
      km.set(key, 'octave ' + octave.toString());
    });
    return km;
  }

  private emitNoteEvent(type: NoteEventType, data: NoteEventData) {
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
