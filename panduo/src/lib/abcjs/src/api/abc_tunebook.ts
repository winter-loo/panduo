// abc_tunebook.ts: TypeScript implementation of the ABC tune-book utilities.

import Parse from '../parse/abc_parse';
import bookParserFactory from '../parse/abc_parse_book';
import tablaturesModule from '../tablatures/abc_tablatures';

const HEADLESS_TARGET = '*' as const;

interface RawTune {
  abc: string;
  startPos: number;
  title?: string;
  id?: string;
  pure?: string;
}

interface BookParserResult {
  header: string;
  tunes: RawTune[];
}

const parseBook = bookParserFactory as (book: string) => BookParserResult;

type TablaturePluginInstance = unknown;

interface TablaturesApi {
  preparePlugins?: (tune: TuneObject, tuneIndex: number, params: RenderParams) => TablaturePluginInstance;
}

const tablatures = tablaturesModule as TablaturesApi;

type PrimitiveTarget = string | number | boolean;

type OutputSpecifier = HTMLElement | PrimitiveTarget | typeof HEADLESS_TARGET | null | undefined;

type NormalizedTarget =
  | { kind: 'element'; ref: HTMLElement }
  | { kind: 'headless'; ref: typeof HEADLESS_TARGET }
  | { kind: 'virtual'; ref: PrimitiveTarget }
  | { kind: 'skip' };

export type TablatureSettings = Array<Record<string, unknown>> & {
  warning_id?: string;
  abcSrc?: string;
};

export interface RenderParams {
  startingTune?: number | string;
  tablature?: TablatureSettings | null;
  visualTranspose?: number;
  [key: string]: unknown;
}

export interface VoiceElement {
  el_type?: string;
  startChar?: number;
  endChar?: number;
  chord?: Array<{ name: string }>;
  startEnding?: number;
  endEnding?: number;
}

export type Voice = VoiceElement[];

export interface StaffDefinition {
  voices: Voice[];
  [key: string]: unknown;
}

export interface TuneLine {
  staff?: StaffDefinition[];
}

export interface TuneObject {
  lines: TuneLine[];
  warnings?: string[];
  tablatures?: unknown;
  getPickupLength: () => number;
  [key: string]: unknown;
}

export interface Measure {
  abc: string;
  lastChord?: string | null;
  startEnding?: number;
  endEnding?: number;
}

export interface ExtractedTuneMeasures {
  header: string;
  measures: Measure[];
  hasPickup: boolean;
}

export type RenderCallbackTarget = HTMLElement | typeof HEADLESS_TARGET | PrimitiveTarget;

export type RenderCallback<TOverride = unknown> = (
  target: RenderCallbackTarget,
  tune: TuneObject,
  outputIndex: number,
  abcString: string
) => TOverride | void;

const isHTMLElement = (value: unknown): value is HTMLElement =>
  typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;

const normalizeTarget = (spec: OutputSpecifier): NormalizedTarget => {
  if (spec === HEADLESS_TARGET) {
    return { kind: 'headless', ref: HEADLESS_TARGET };
  }

  if (spec == null) {
    return { kind: 'skip' };
  }

  if (typeof spec === 'string') {
    if (typeof document === 'undefined') {
      return { kind: 'skip' };
    }
    const element = document.getElementById(spec);
    return element ? { kind: 'element', ref: element } : { kind: 'skip' };
  }

  if (isHTMLElement(spec)) {
    return { kind: 'element', ref: spec };
  }

  return { kind: 'virtual', ref: spec };
};

const normalizeOutputs = (output: OutputSpecifier | OutputSpecifier[]): NormalizedTarget[] =>
  (Array.isArray(output) ? output : [output]).map(normalizeTarget);

const parseStartingTune = (value?: number | string): number => {
  if (value == null) {
    return 0;
  }
  const parsed = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const clearElement = (element: HTMLElement | null): void => {
  if (element) {
    element.innerHTML = '';
  }
};

const attachTablatureIfNeeded = (tune: TuneObject, tuneIndex: number, params: RenderParams): void => {
  if (!params.tablature || !tablatures.preparePlugins) {
    return;
  }
  tune.tablatures = tablatures.preparePlugins(tune, tuneIndex, params);
};

export const numberOfTunes = (abc: string): number => {
  const tunes = abc.split('\nX:');
  return Math.max(1, tunes.length);
};

export class TuneBook {
  readonly header: string;
  readonly tunes: ReadonlyArray<RawTune>;

  constructor(book: string) {
    const parsed = parseBook(book);
    this.header = parsed.header;
    this.tunes = Object.freeze(parsed.tunes.slice());
  }

  getTuneById(id: string | number): RawTune | null {
    const normalized = String(id);
    return this.tunes.find((tune) => tune.id === normalized) ?? null;
  }

  getTuneByTitle(title: string): RawTune | null {
    return this.tunes.find((tune) => tune.title === title) ?? null;
  }
}

export function parseOnly(abc: string, params?: RenderParams): TuneObject[] {
  const count = numberOfTunes(abc);
  const placeholders = Array.from({ length: count }, () => HEADLESS_TARGET);
  const noop: RenderCallback<TuneObject> = () => undefined;
  return renderEngine<TuneObject>(noop, placeholders, abc, params);
}

export function renderEngine<TOverride = unknown>(
  callback: RenderCallback<TOverride>,
  output: OutputSpecifier | OutputSpecifier[],
  abc: string,
  params: RenderParams = {}
): Array<TuneObject | TOverride> {
  if (output === undefined || abc === undefined) {
    return [];
  }

  const targets = normalizeOutputs(output);
  const parser = new Parse();
  const book = new TuneBook(abc);
  let currentTune = parseStartingTune(params.startingTune);
  const results: Array<TuneObject | TOverride> = [];

  targets.forEach((target, index) => {
    if (target.kind === 'skip') {
      currentTune += 1;
      return;
    }

    const tuneMeta = book.tunes[currentTune];
    if (!tuneMeta) {
      if (target.kind === 'element') {
        clearElement(target.ref);
      }
      currentTune += 1;
      return;
    }

    parser.parse(tuneMeta.abc, params, tuneMeta.startPos - book.header.length);
    const tune = parser.getTune();
    attachTablatureIfNeeded(tune, currentTune, params);
    const warnings = parser.getWarnings();
    if (warnings && warnings.length) {
      tune.warnings = warnings;
    }

    const callbackTarget: RenderCallbackTarget =
      target.kind === 'element' ? target.ref : target.kind === 'headless' ? HEADLESS_TARGET : target.ref;

    const override = callback(callbackTarget, tune, index, tuneMeta.abc);
    results.push((override ?? tune) as TOverride | TuneObject);
    currentTune += 1;
  });

  return results;
}

export function flattenTune(tuneObj: TuneObject): StaffDefinition[] {
  const staves: StaffDefinition[] = [];

  tuneObj.lines.forEach((line) => {
    line.staff?.forEach((staff, staffIndex) => {
      if (!staves[staffIndex]) {
        staves[staffIndex] = {
          ...staff,
          voices: staff.voices.map((voice) => voice.slice()),
        };
        return;
      }

      staff.voices.forEach((voice, voiceIndex) => {
        if (staves[staffIndex].voices[voiceIndex]) {
          staves[staffIndex].voices[voiceIndex] = staves[staffIndex].voices[voiceIndex].concat(voice);
        } else {
          staves[staffIndex].voices[voiceIndex] = voice.slice();
        }
      });
    });
  });

  return staves;
}

const buildMeasureFromFragment = (
  tune: RawTune,
  fragStart: number,
  barEnd: number,
  measureStartChord: VoiceElement | null,
  element: VoiceElement
): Measure => {
  const fragment = tune.abc.substring(fragStart, barEnd);
  const lastChord =
    measureStartChord?.chord && measureStartChord.chord.length > 0 ? measureStartChord.chord[0].name : null;

  const measure: Measure = { abc: fragment };
  if (lastChord) {
    measure.lastChord = lastChord;
  }
  if (element.startEnding !== undefined) {
    measure.startEnding = element.startEnding;
  }
  if (element.endEnding !== undefined) {
    measure.endEnding = element.endEnding;
  }
  return measure;
};

export function measuresParser(staff: StaffDefinition, tune: RawTune): Measure[][] {
  return staff.voices.map((voice) => {
    const measures: Measure[] = [];
    let lastChord: VoiceElement | null = null;
    let measureStartChord: VoiceElement | null = null;
    let fragStart: number | null = null;
    let hasNotes = false;

    voice.forEach((element) => {
      const elementStart = element.startChar ?? -1;
      const elementEnd = element.endChar ?? elementStart;
      if (fragStart === null && elementStart >= 0) {
        fragStart = elementStart;
        measureStartChord = element.chord ? null : lastChord;
      }

      if (element.chord) {
        lastChord = element;
      }

      if (element.el_type === 'bar' && hasNotes && fragStart !== null) {
        measures.push(buildMeasureFromFragment(tune, fragStart, elementEnd, measureStartChord, element));
        fragStart = null;
        hasNotes = false;
      } else if (element.el_type === 'note') {
        hasNotes = true;
      }
    });

    return measures;
  });
}

export function extractMeasures(abc: string): ExtractedTuneMeasures[] {
  const book = new TuneBook(abc);

  return book.tunes.map((tune) => {
    const arr = tune.abc.split('K:');
    const arr2 = (arr[1] ?? '').split('\n');
    const header = `${arr[0] ?? ''}K:${arr2[0] ?? ''}\n`;
    const measures: Measure[] = [];

    const [parsedTune] = parseOnly(tune.abc);
    const pickupLength = parsedTune?.getPickupLength?.() ?? 0;
    const hasPickup = pickupLength > 0;

    if (parsedTune) {
      parsedTune.lines.forEach((line) => {
        line.staff?.slice(0, 1).forEach((staff) => {
          staff.voices.slice(0, 1).forEach((voice) => {
            let lastChord: VoiceElement | null = null;
            let measureStartChord: VoiceElement | null = null;
            let fragStart: number | null = null;
            let hasNotes = false;

            voice.forEach((element) => {
              const elementStart = element.startChar ?? -1;
              const elementEnd = element.endChar ?? elementStart;

              if (fragStart === null && elementStart >= 0) {
                fragStart = elementStart;
                measureStartChord = element.chord ? null : lastChord;
              }

              if (element.chord) {
                lastChord = element;
              }

              if (element.el_type === 'bar' && hasNotes && fragStart !== null) {
                measures.push(buildMeasureFromFragment(tune, fragStart, elementEnd, measureStartChord, element));
                fragStart = null;
                hasNotes = false;
              } else if (element.el_type === 'note') {
                hasNotes = true;
              }
            });
          });
        });
      });
    }

    return {
      header,
      measures,
      hasPickup,
    };
  });
}
