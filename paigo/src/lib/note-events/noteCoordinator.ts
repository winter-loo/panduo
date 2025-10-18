import { writable, type Readable } from 'svelte/store';
import {
  type EmitNoteEvent,
  type NoteControlRegistration,
  type NoteEventHandler,
  type NoteEventType,
  type NoteIdentifier,
  type RoutedNoteEvent,
} from './types';

// Track which controls currently hold each normalized note identifier.
type ActiveNoteSources = Map<NoteIdentifier, Set<string>>;

function sanitizeNoteName(note: string) {
  // Normalize consecutive sharps (unlikely) and ensure spacing-free identifiers.
  return note.trim();
}

export function noteIdentifier(event: Pick<EmitNoteEvent, 'note' | 'octave' | 'sharp'>): NoteIdentifier {
  const sanitized = sanitizeNoteName(event.note);
  const stripped = sanitized.replace('#', '');
  if (typeof event.sharp === 'boolean') {
    return `${stripped}${event.sharp ? '#' : ''}${event.octave}`;
  }
  if (sanitized.includes('#')) {
    return `${stripped}#${event.octave}`;
  }
  return `${stripped}${event.octave}`;
}

// Coordinates note events from multiple sources (keyboard, hardware MIDI, UI) so that
// main side-effects (audio playback, staff rendering) run exactly once while every
// participating control can keep its UI in sync. It also maintains the set of active
// notes, enabling global highlights without duplicating state.
class NoteCoordinator {
  // Registered controls emitting or syncing note events, keyed by control id.
  private controls = new Map<string, NoteControlRegistration>();
  // Primary handlers run once per event to handle main side-effects (audio, staff, etc.).
  private primaryHandlers = new Set<NoteEventHandler>();
  // Tracks which control ids currently report a note as active.
  private activeNoteSources: ActiveNoteSources = new Map();
  // Svelte store exposing currently active note identifiers for UI consumers.
  private activeNotesStore = writable<NoteIdentifier[]>([]);

  get activeNotes(): Readable<NoteIdentifier[]> {
    return this.activeNotesStore;
  }

  registerControl(registration: NoteControlRegistration): () => void {
    this.controls.set(registration.id, registration);
    return () => {
      this.controls.delete(registration.id);
    };
  }

  onPrimary(handler: NoteEventHandler): () => void {
    this.primaryHandlers.add(handler);
    return () => {
      this.primaryHandlers.delete(handler);
    };
  }

  emitNoteOn(event: EmitNoteEvent) {
    this.routeEvent('noteon', event);
  }

  emitNoteOff(event: EmitNoteEvent) {
    this.routeEvent('noteoff', event);
  }

  private routeEvent(type: NoteEventType, event: EmitNoteEvent) {
    // Basic event payload shared between the originating handler and forwarded listeners.
    const routedBase: Omit<RoutedNoteEvent, 'type' | 'isForwarded' | 'originId' | 'originRole' | 'targetId' | 'targetRole'> =
    {
      note: sanitizeNoteName(event.note),
      octave: event.octave,
      sharp: event.sharp,
      velocity: event.velocity,
      timestamp: event.timestamp,
    };

    const originEvent: RoutedNoteEvent = {
      type,
      ...routedBase,
      originId: event.sourceId,
      originRole: event.sourceRole,
      isForwarded: false,
    };

    this.updateActiveNotes(type, originEvent, event.sourceId);
    this.dispatchPrimary(originEvent);
    this.forwardToSyncedControls(type, originEvent);
  }

  private dispatchPrimary(event: RoutedNoteEvent) {
    // Primary handlers perform side-effects exactly once (audio playback, notation updates, etc.).
    this.primaryHandlers.forEach((handler) => {
      handler(event);
    });
  }

  private forwardToSyncedControls(type: NoteEventType, event: RoutedNoteEvent) {
    // Notify registered controls (except the origin) so they can sync UI state.
    this.controls.forEach((registration, controlId) => {
      if (controlId === event.originId) return;
      const syncHandler = registration.sync?.[type];
      if (!syncHandler) return;
      syncHandler({
        ...event,
        isForwarded: true,
        targetId: controlId,
        targetRole: registration.role,
      });
    });
  }

  private updateActiveNotes(type: NoteEventType, event: RoutedNoteEvent, sourceId: string) {
    // Maintain the set of active notes and which controls currently hold them.
    const id = noteIdentifier({ note: event.note, octave: event.octave, sharp: event.sharp });
    const existingSources = this.activeNoteSources.get(id) ?? new Set<string>();
    let changed = false;

    if (type === 'noteon') {
      const sizeBefore = existingSources.size;
      existingSources.add(sourceId);
      if (existingSources.size !== sizeBefore) {
        changed = true;
      }
      if (!this.activeNoteSources.has(id)) {
        this.activeNoteSources.set(id, existingSources);
        changed = true;
      }
    } else {
      if (existingSources.has(sourceId)) {
        existingSources.delete(sourceId);
        changed = true;
      }
      if (existingSources.size === 0) {
        this.activeNoteSources.delete(id);
      }
    }

    if (changed) {
      this.activeNotesStore.set([...this.activeNoteSources.keys()]);
    }
  }
}

export const noteCoordinator = new NoteCoordinator();
