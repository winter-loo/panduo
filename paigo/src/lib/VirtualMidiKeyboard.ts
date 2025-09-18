import { EventEmitter } from 'events';
import {
  showPianoLoading,
  hidePianoLoading,
  requirePianoUserGesture,
  clearPianoUserGesture,
} from '$lib/stores/pianoLoading';

export interface VirtualMidiKeyboardOption {
  audioSamplesUri?: string;
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
  private unlockHandler: any;
  private pianoSound: any;
  private audioSamplesUri?: any;
  private tone: any;

  constructor(options?: VirtualMidiKeyboardOption) {
    super();

    this.keydownListener = null;
    this.keyupListener = null;
    this.unlockHandler = null;
    this.pianoSound = null;
    this.audioSamplesUri = options?.audioSamplesUri;
    this.tone = null;
  }

  private async ensureToneReady() {
    if (typeof window === 'undefined') return;
    if (!this.tone) {
      try {
        const Tone = await import('tone');
        // Create a low-latency context and set as global Tone context
        const ctx = new Tone.Context({ latencyHint: 'interactive', lookAhead: 0 });
        Tone.setContext(ctx);
        this.tone = Tone;
      } catch (e) {
        // no-op if Tone couldn't be loaded; piano will still emit events without sound
      }
    }
    // If context is not running, do not block; request user gesture via overlay button.
    if (this.tone && this.tone.getContext().state !== 'running') {
      requirePianoUserGesture(() => {
        // Called in a user gesture. Try to start; don't rely on outer awaits.
        showPianoLoading('Enabling audio...');
        void this.tone
          .start()
          .then(() => {
            clearPianoUserGesture();
          })
          .catch(() => {
            // Keep the button visible if it still fails
          });
      });
      return;
    }
    clearPianoUserGesture();
  }

  _addListeners() {
    if (typeof document === 'undefined') return;
    let self = this;
    this.keydownListener = async function (event: any) {
      event.preventDefault();
      // Make sure audio context is ready ASAP on first interaction
      void self.ensureToneReady();
      let validKeyDown = self.NoteNameMap.get(event.code);

      if (validKeyDown != undefined && !validKeyDown.holding) {
        validKeyDown.holding = true;
        let octaveNumberHolding = false;
        self.OctaveNumberMap.forEach(({ octave, holding }, _key) => {
          if (holding) {
            octaveNumberHolding = true;
            if (self.pianoSound)
              self.pianoSound.keyDown({ note: `${validKeyDown.noteName}${octave}` });
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
              if (self.pianoSound)
                self.pianoSound.keyDown({ note: `${noteName}${validKeyDown.octave}` });
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

    // Explicit unlock handled via overlay button; no global pointerdown hook needed.
  }

  _removeListeners() {
    if (typeof document === 'undefined') return;
    document.removeEventListener('keydown', this.keydownListener);
    document.removeEventListener('keyup', this.keyupListener);
    // No unlock handler to remove; handled by overlay button
  }

  async charge(): Promise<void> {
    // Avoid loading audio libraries during SSR
    if (typeof window === 'undefined') return;
    if (this.audioSamplesUri) {
      showPianoLoading('Loading piano sound...');
      // Prepare Tone with low-latency settings before creating the piano
      await this.ensureToneReady();
      // Dynamically import the piano library only in the browser to avoid SSR errors.
      const mod = await import('@tonejs/piano');
      const PianoSound = mod.Piano as any;
      this.pianoSound = new PianoSound({
        url: this.audioSamplesUri,
        velocities: 5,
      });
      this.pianoSound.toDestination();
      console.log('[VirtualMidiKeyboard] loading audio samples...');
      try {
        await this.pianoSound.load();
      } finally {
        hidePianoLoading();
      }
    }
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
}

let virtualMidiKeyboard: VirtualMidiKeyboard;

export function getVirtualMidiKeyboard(): VirtualMidiKeyboard {
  if (!virtualMidiKeyboard) {
    virtualMidiKeyboard = new VirtualMidiKeyboard({ audioSamplesUri: '/audio/' });

    virtualMidiKeyboard.charge().then(() => {
      console.log('midi keyboard connected');
    });
  }
  return virtualMidiKeyboard;
}
