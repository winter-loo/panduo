import type { NoteEventData, RoutedNoteEvent } from '$lib/note-events/types';
import { noteCoordinator } from '$lib/note-events/noteCoordinator';
import {
  clearPianoUserGesture,
  hidePianoLoading,
  requirePianoUserGesture,
  showPianoLoading,
} from '$lib/stores/pianoLoading';

export interface PianoAudioEngineOptions {
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

class PianoAudioEngine {
  private tone: ToneType | null = null;
  private piano: InstanceType<PianoModule['Piano']> | null = null;
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
    options?: PianoAudioEngineOptions,
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    await this.ensurePianoReady();

    if (options?.preload === 'full') {
      await this.preloadAllSamples();
    }
  }

  private async ensurePianoReady(): Promise<void> {
    if (this.piano) return;
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    const init = async () => {
      await this.ensureToneReady();
      const mod = await import('tone-piano-next');
      const PianoSound = mod.Piano as PianoModule['Piano'];
      this.piano = new PianoSound({
        url: '/audio/',
        velocities: 5,
        pedal: false,
      });
      this.piano.toDestination();
    };

    try {
      this.initializationPromise = init();
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async preloadAllSamples(): Promise<void> {
    if (!this.piano) {
      await this.ensurePianoReady();
    }
    if (!this.piano) return;

    if (this.fullLoadPromise) {
      await this.fullLoadPromise;
      return;
    }

    const load = async () => {
      showPianoLoading('Loading piano sound...');
      try {
        await this.piano?.load();
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
    return Boolean(this.piano);
  }

  play(data: NoteEventData) {
    if (!this.piano) return;
    const noteId = buildNoteId(data);
    if (!noteId) return;
    if (this.activeNotes.has(noteId)) return;
    this.activeNotes.add(noteId);
    this.piano.keyDown({ note: noteId, velocity: data.velocity });
  }

  stop(data: NoteEventData) {
    if (!this.piano) return;
    const noteId = buildNoteId(data);
    if (!noteId) return;
    if (!this.activeNotes.has(noteId)) return;
    this.activeNotes.delete(noteId);
    this.piano.keyUp({ note: noteId });
  }

  handlePrimaryEvent(event: RoutedNoteEvent) {
    if (event.type === 'noteon') {
      this.play(event);
    } else {
      this.stop(event);
    }
  }
}

const pianoAudioEngine = new PianoAudioEngine();

noteCoordinator.onPrimary((event) => {
  pianoAudioEngine.handlePrimaryEvent(event);
});

export async function ensurePianoAudioContextReady(): Promise<void> {
  await pianoAudioEngine.ensureToneReady();
}

export async function preparePianoAudioEngine(
  options?: PianoAudioEngineOptions,
): Promise<void> {
  await pianoAudioEngine.prepare(options);
}

export function playPianoNote(data: NoteEventData) {
  pianoAudioEngine.play(data);
}

export function stopPianoNote(data: NoteEventData) {
  pianoAudioEngine.stop(data);
}

export function isPianoAudioReady(): boolean {
  return pianoAudioEngine.isReady();
}
