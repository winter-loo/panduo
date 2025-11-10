// Type definitions for abcjs animation

export type NoteTimingEventType = 'event' | 'grace' | 'rest';

export interface NoteTimingEvent {
  milliseconds: number;
  millisecondsPerMeasure: number;
  type: NoteTimingEventType;
  elements?: Array<Array<HTMLElement>>;
  endChar?: number;
  endCharArray?: number[];
  endX?: number;
  height?: number;
  left?: number;
  line?: number;
  measureNumber?: number;
  startChar?: number;
  startCharArray?: number[];
  top?: number;
  width?: number;
  measureStart?: boolean;
}

export interface TimingCallbacksPosition {
  startChar: number;
  endChar: number;
  top: number;
  left: number;
  bottom: number;
  line: number;
}

export interface TimingCallbacksDebug {
  lastEvent: number;
  lastEventIndex: number;
  lastEventOffset: number;
  lastEventTime: number;
  lastLine: number;
  lastMeasure: number;
  lastMeasureTime: number;
  lastStartTime: number;
  lastStartX: number;
  lastX: number;
  lineStartTime: number;
  lineStartX: number;
  measureStartTime: number;
  x: number;
}

export type EventCallbackReturn = boolean | void;

export interface EventCallback {
  (event: NoteTimingEvent): EventCallbackReturn;
}

export interface BeatCallback {
  (beatNumber: number, totalBeats: number, totalTime: number): void;
}

export interface LineEndCallback {
  (lastEvent: NoteTimingEvent): void;
}

export interface AnimationOptions {
  qpm?: number;
  extraMeasuresAtBeginning?: number;
  lineEndAnticipation?: number;
  beatSubdivisions?: number;
  beatCallback?: BeatCallback;
  eventCallback?: EventCallback;
  lineEndCallback?: LineEndCallback;
}
