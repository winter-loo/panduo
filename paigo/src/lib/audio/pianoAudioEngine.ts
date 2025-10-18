import type { NoteEventData, RoutedNoteEvent } from '$lib/note-events/types';
import { noteCoordinator } from '$lib/note-events/noteCoordinator';
import {
  clearPianoUserGesture,
  hidePianoLoading,
  requirePianoUserGesture,
  showPianoLoading,
} from '$lib/stores/pianoLoading';

export interface PianoAudioEngineOptions {
  audioSamplesUri?: string;
}

type ToneType = typeof import('tone');

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
  private piano: any = null;
  private activeNotes = new Set<string>();
  private audioSamplesUri?: string;
  private loadPromise: Promise<void> | null = null;

  configure(options?: PianoAudioEngineOptions) {
    if (options?.audioSamplesUri) {
      this.audioSamplesUri = options.audioSamplesUri;
    }
  }

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

  async prepare(options?: PianoAudioEngineOptions): Promise<void> {
    if (typeof window === 'undefined') return;
    this.configure(options);
    if (!this.audioSamplesUri) return;
    if (this.piano) return;
    if (!this.loadPromise) {
      this.loadPromise = this.loadSamples();
    }
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async loadSamples(): Promise<void> {
    if (!this.audioSamplesUri) return;
    showPianoLoading('Loading piano sound...');
    try {
      await this.ensureToneReady();
      const mod = await import('@tonejs/piano');
      const PianoSound = mod.Piano as any;
      this.piano = new PianoSound({
        url: this.audioSamplesUri,
        velocities: 5,
      });
      this.piano.toDestination();
      await this.piano.load();
    } finally {
      hidePianoLoading();
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
