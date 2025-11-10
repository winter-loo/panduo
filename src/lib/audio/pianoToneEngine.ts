import type { NoteEventData, RoutedNoteEvent } from '$lib/note-events/types';
import { noteCoordinator } from '$lib/note-events/noteCoordinator';
import {
  clearPianoUserGesture,
  hidePianoLoading,
  requirePianoUserGesture,
  showPianoLoading,
} from '$lib/stores/pianoLoading';

export interface PianoToneEngineOptions {
  preload?: 'none' | 'full';
}

type ToneType = typeof import('tone');
type PianoModule = typeof import('tone-piano-next');

function buildNoteId({ note, octave, sharp }: NoteEventData): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  if (!trimmed) return null;
  const withoutAccidental = trimmed.replace('#', '');
  const isSharp = typeof sharp === 'boolean' ? sharp : trimmed.includes('#');
  return `${withoutAccidental}${isSharp ? '#' : ''}${octave}`;
}

class PianoToneEngine {
  private tone: ToneType | null = null;
  private pianoTone: InstanceType<PianoModule['Piano']> | null = null;
  private activeNotes = new Set<string>();
  private initializationPromise: Promise<void> | null = null;
  private fullLoadPromise: Promise<void> | null = null;

  async ensureToneReady(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.tone) {
      try {
        const Tone = await import('tone');
        const ctx = new Tone.Context({ latencyHint: 'interactive', lookAhead: 0 });
        Tone.setContext(ctx);
        this.tone = Tone;
      } catch {
        return;
      }
    }

    if (this.tone && this.tone.getContext().state !== 'running') {
      requirePianoUserGesture(() => {
        if (!this.tone) return;
        showPianoLoading('Enabling audio...');
        void this.tone
          .start()
          .then(() => {
            clearPianoUserGesture();
          })
          .catch(() => {
            /* keep overlay visible */
          });
      });
      return;
    }

    clearPianoUserGesture();
  }

  async prepare(
    options?: PianoToneEngineOptions,
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    await this.ensurePianoReady();

    if (options?.preload === 'full') {
      await this.preloadAllSamples();
    }
  }

  private async ensurePianoReady(): Promise<void> {
    if (this.pianoTone) return;
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    const init = async () => {
      await this.ensureToneReady();
      const mod = await import('tone-piano-next');
      const PianoToneLib = mod.Piano as PianoModule['Piano'];
      this.pianoTone = new PianoToneLib({
        url: '/audio/',
        velocities: 5,
        pedal: false,
      });
      this.pianoTone.toDestination();
    };

    try {
      this.initializationPromise = init();
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async preloadAllSamples(): Promise<void> {
    if (!this.pianoTone) {
      await this.ensurePianoReady();
    }
    if (!this.pianoTone) return;

    if (this.fullLoadPromise) {
      await this.fullLoadPromise;
      return;
    }

    const load = async () => {
      showPianoLoading('Loading piano sound...');
      try {
        await this.pianoTone?.load();
      } catch (e) {
        console.trace('failed to load piano audio', e);
      } finally {
        hidePianoLoading();
      }
    };

    try {
      this.fullLoadPromise = load();
      await this.fullLoadPromise;
    } finally {
      this.fullLoadPromise = null;
    }
  }

  isReady(): boolean {
    return Boolean(this.pianoTone);
  }

  play(data: NoteEventData) {
    if (!this.pianoTone) return;
    const noteId = buildNoteId(data);
    if (!noteId) return;
    if (this.activeNotes.has(noteId)) return;
    this.activeNotes.add(noteId);
    this.pianoTone.keyDown({ note: noteId, velocity: data.velocity });
  }

  stop(data: NoteEventData) {
    if (!this.pianoTone) return;
    const noteId = buildNoteId(data);
    if (!noteId) return;
    if (!this.activeNotes.has(noteId)) return;
    this.activeNotes.delete(noteId);
    this.pianoTone.keyUp({ note: noteId });
  }

  handlePrimaryEvent(event: RoutedNoteEvent) {
    if (event.type === 'noteon') {
      this.play(event);
    } else {
      this.stop(event);
    }
  }
}

const pianoToneEngine = new PianoToneEngine();

noteCoordinator.onPrimary((event) => {
  pianoToneEngine.handlePrimaryEvent(event);
});

export async function ensurePianoAudioContextReady(): Promise<void> {
  await pianoToneEngine.ensureToneReady();
}

export async function preparePianoAudioEngine(
  options?: PianoToneEngineOptions,
): Promise<void> {
  await pianoToneEngine.prepare(options);
}

export function playPianoNote(data: NoteEventData) {
  pianoToneEngine.play(data);
}

export function stopPianoNote(data: NoteEventData) {
  pianoToneEngine.stop(data);
}

export function isPianoAudioReady(): boolean {
  return pianoToneEngine.isReady();
}
