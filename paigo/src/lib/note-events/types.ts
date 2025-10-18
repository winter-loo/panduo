export type NoteEventType = 'noteon' | 'noteoff';

export type NoteSourceRole = 'main' | 'sub';

export interface NoteEventData {
  note: string;
  octave: number;
  /**
   * Explicit sharp flag for emitters that distinguish between note letter and accidental.
   * When omitted, the coordinator falls back to inspecting the `note` string.
   */
  sharp?: boolean;
  velocity?: number;
  timestamp?: number;
}

export interface EmitNoteEvent extends NoteEventData {
  sourceId: string;
  sourceRole: NoteSourceRole;
}

export interface RoutedNoteEvent extends NoteEventData {
  type: NoteEventType;
  originId: string;
  originRole: NoteSourceRole;
  isForwarded: boolean;
  targetId?: string;
  targetRole?: NoteSourceRole;
}

export type NoteEventHandler = (event: RoutedNoteEvent) => void;

export interface NoteControlRegistration {
  id: string;
  role: NoteSourceRole;
  sync?: {
    noteon?: NoteEventHandler;
    noteoff?: NoteEventHandler;
  };
}

export type NoteIdentifier = string;
