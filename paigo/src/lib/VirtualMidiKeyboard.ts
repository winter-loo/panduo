import { EventEmitter } from 'events'
import { Piano as PianoSound } from '@tonejs/piano'

export interface VirtualMidiKeyboardOption {
  audioSamplesUri?: string,
}

export class VirtualMidiKeyboard extends EventEmitter {

  private NoteNameMap = new Map([
    ['Space', { noteName: 'C', holding: false }],
    ['KeyJ', { noteName: 'D', holding: false }],
    ['KeyK', { noteName: 'E', holding: false }],
    ['KeyL', { noteName: 'F', holding: false }],
    ['Semicolon', { noteName: 'G', holding: false }],
    ['Quote', { noteName: 'A', holding: false }],
    ['Enter', { noteName: 'B', holding: false }],
    ['KeyN', { noteName: 'C#', holding: false }],
    ['KeyI', { noteName: 'D#', holding: false }],
    ['KeyO', { noteName: 'F#', holding: false }],
    ['KeyP', { noteName: 'G#', holding: false }],
    ['BracketLeft', { noteName: 'A#', holding: false }],
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
  private pianoSound: any;
  private audioSamplesUri?: any;

  constructor(options?: VirtualMidiKeyboardOption) {
    super();

    this.keydownListener = null;
    this.keyupListener = null;
    this.pianoSound = null;
    this.audioSamplesUri = options?.audioSamplesUri;
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
            if (self.pianoSound) self.pianoSound.keyDown({ note: `${validKeyDown.noteName}${octave}` });
            self.emit('noteOn', { note: validKeyDown.noteName, octave: octave });
          }
        });
        if (!octaveNumberHolding) {
          if (self.pianoSound) self.pianoSound.keyDown({ note: `${validKeyDown.noteName}4` });
          self.emit('noteOn', { note: validKeyDown.noteName, octave: 4 });
        }
      } else if (validKeyDown == undefined) {
        let validKeyDown = self.OctaveNumberMap.get(event.code);
        if (validKeyDown != undefined && !validKeyDown.holding) {
          validKeyDown.holding = true;
          self.NoteNameMap.forEach(({ noteName, holding }, _key) => {
            if (holding) {
              if (self.pianoSound) self.pianoSound.keyDown({ note: `${noteName}${validKeyDown.octave}` });
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
        let hasOctaveNumberHolding = false;
        self.OctaveNumberMap.forEach(({ octave, holding }, _key) => {
          if (holding) {
            hasOctaveNumberHolding = true;
            if (self.pianoSound) self.pianoSound.keyUp({ note: `${state.noteName}${octave}` });
            self.emit('noteOff', { note: state.noteName, octave });
          }
        });
        if (!hasOctaveNumberHolding) {
          if (self.pianoSound) self.pianoSound.keyUp({ note: `${state.noteName}4` });
          self.emit('noteOff', { note: state.noteName, octave: 4 });
        }
      } else {
        let state = self.OctaveNumberMap.get(event.code);
        if (state) {
          state.holding = false;
          self.NoteNameMap.forEach(({ noteName, holding }, _key) => {
            if (holding) {
              if (self.pianoSound) self.pianoSound.keyUp({ note: `${noteName}${state.octave}` });
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

  connect(): Promise<void> {
    this._addListeners();

    if (this.audioSamplesUri) {
      this.pianoSound = new PianoSound({
        url: this.audioSamplesUri,
        velocities: 5
      });
      this.pianoSound.toDestination();

      console.log('[VirtualMidiKeyboard] loading audio samples...');
      return this.pianoSound.load();
    }
    return Promise.resolve();
  }

  disconnect() {
    this._removeListeners();
  }
}

let virtualMidiKeyboard: VirtualMidiKeyboard;

export function getVirtualMidiKeyboard(): VirtualMidiKeyboard {
  if (!virtualMidiKeyboard) {
    virtualMidiKeyboard = new VirtualMidiKeyboard({ audioSamplesUri: "/audio/" });

    virtualMidiKeyboard.connect().then(() => {
      console.log('midi keyboard connected');
    });
  }
  return virtualMidiKeyboard;
}
