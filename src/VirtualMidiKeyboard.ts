import { EventEmitter } from 'events'

export class VirtualMidiKeyboard extends EventEmitter {

  private NoteNameMap = new Map([
    ['Space', { noteName: 'C', holding: false }],
    ['KeyF', { noteName: 'D', holding: false }],
    ['KeyG', { noteName: 'E', holding: false }],
    ['KeyH', { noteName: 'F', holding: false }],
    ['KeyJ', { noteName: 'G', holding: false }],
    ['KeyK', { noteName: 'A', holding: false }],
    ['KeyL', { noteName: 'B', holding: false }],
  ]);

  // 'A', 'S', 'D' for increment octaves
  // A: C5, S: C6, D: C7
  // 'Z', 'X', 'C' for decrement octaves
  // Z: C3, X: C2, C: C1
  // Q for C8, W for C0
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
  }

  _addListeners() {
    let self = this;
    this.keydownListener = function (event: any) {
      let validKeyDown = self.NoteNameMap.get(event.code);

      if (validKeyDown != undefined && !validKeyDown.holding) {
        validKeyDown.holding = true;
        let octaveNumberHolding = false;
        self.OctaveNumberMap.forEach(({ octave, holding }, _key) => {
          if (holding) {
            octaveNumberHolding = true;
            self.emit('noteOn', { note: validKeyDown.noteName, octave: octave });
          }
        });
        if (!octaveNumberHolding) {
          self.emit('noteOn', { note: validKeyDown.noteName, octave: 4 });
        }
      } else if (validKeyDown == undefined) {
        let validKeyDown = self.OctaveNumberMap.get(event.code);
        if (validKeyDown != undefined && !validKeyDown.holding) {
          validKeyDown.holding = true;
          self.NoteNameMap.forEach(({ noteName, holding }, _key) => {
            if (holding) {
              self.emit('noteOn', { note: noteName, octave: validKeyDown.octave });
            }
          });
        }
      }
    };

    this.keyupListener = function (event: any) {
      let state = self.NoteNameMap.get(event.code);
      if (state) {
        state.holding = false;
        self.OctaveNumberMap.forEach(({ octave, holding }, _key) => {
          if (holding) {
            self.emit('noteOff', { note: state.noteName, octave });
          }
        })
      } else {
        let state = self.OctaveNumberMap.get(event.code);
        if (state) {
          state.holding = false;
          self.NoteNameMap.forEach(({ noteName, holding }, _key) => {
            if (holding) {
              self.emit('noteOff', { note: noteName, octave: state.octave });
            }
          });
        }
      }
    };

    document.addEventListener('keydown', this.keydownListener);
    document.addEventListener('keyup', this.keyupListener);
  }

  _removeListeners() {
    document.removeEventListener('keydown', this.keydownListener);
    document.removeEventListener('keyup', this.keyupListener);
  }

  connect() {
    this._addListeners();
  }

  disconnect() {
    this._removeListeners();
  }
}
