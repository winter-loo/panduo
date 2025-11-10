// abc_parse.ts: modern TypeScript implementation of the ABC notation parser.

import parseCommon from './abc_common';
import parseDirective from './abc_parse_directive';
import ParseHeader from './abc_parse_header';
import ParseMusic from './abc_parse_music';
import Tokenizer from './abc_tokenizer';
import wrap from './wrap_lines';

import Tune from '../data/abc_tune';
import TuneBuilder from './tune-builder';

const CONTINUATION_CHAR = '\x12';
const NORMAL_ABORT = 'normal_abort';

const DEFAULT_PAGE_WIDTH = 8.5 * 72;
const DEFAULT_PAGE_HEIGHT = 11 * 72;

const LANDSCAPE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  legal: { width: 8.5 * 72, height: 14 * 72 },
  A4: { width: 8.3 * 72, height: 11.7 * 72 },
};

const enum LyricSkipTarget {
  Next = 'next',
  Slur = 'slur',
  Bar = 'bar',
}

type FontKey =
  | 'annotationfont'
  | 'gchordfont'
  | 'vocalfont'
  | 'tripletfont'
  | 'measurefont'
  | 'repeatfont';

type PositioningKey = 'vocalPosition' | 'dynamicPosition' | 'chordPosition' | 'ornamentPosition' | 'volumePosition';

export interface ParserSwitches {
  header_only?: boolean;
  stop_on_warning?: boolean;
  print?: boolean;
  format?: Record<string, unknown>;
  hint_measures?: boolean;
  transpose?: number;
  visualTranspose?: number | string;
  lineBreaks?: number[];
}

interface WarningObject {
  message: string;
  line: string;
  startChar: number;
  column: number;
}

interface FontDefinition {
  face: string;
  size: number;
  weight: string;
  style: string;
  decoration: string;
  box?: boolean;
}

interface LyricToken {
  syllable?: string;
  divider?: string;
  skip?: boolean;
  to?: LyricSkipTarget;
}

interface VoiceElement {
  el_type?: string;
  startChar?: number;
  endChar?: number;
  pitches?: unknown;
  rest?: { type?: string };
  chord?: Array<{ name: string }>;
  chordSymbol?: unknown;
  lyric?: LyricToken[];
  startEnding?: number;
  endEnding?: number;
  [key: string]: unknown;
}

type VoiceLine = VoiceElement[];

interface StaffVoice {
  voices: VoiceLine[];
  [key: string]: unknown;
}

interface StaffLine {
  staff?: StaffVoice[];
  [key: string]: unknown;
}

interface HeaderParseResult {
  regular?: boolean;
  newline?: boolean;
  words?: boolean;
  symbols?: boolean;
}

type WarnHandler = (message: string, line: string, column: number) => void;

type TokenizerLike = InstanceType<typeof Tokenizer>;

type HeaderParser = InstanceType<typeof ParseHeader> & {
  parseHeader(line: string): HeaderParseResult;
  reset(tokenizer: TokenizerLike, warn: WarnHandler, multilineVars: MultilineState, tune: TuneLike): void;
};

type MusicParser = InstanceType<typeof ParseMusic> & {
  parseMusic(line: string): void;
  startNewLine(): void;
  lineContinuation?: boolean;
};

interface TuneLike {
  formatting: Record<string, unknown>;
  lines: StaffLine[];
  media: string;
  metaText: Record<string, unknown>;
  metaTextInfo: Record<string, unknown>;
  version: string;
  lineBreaks?: number[];
  visualTranspose?: number;
  addElementToEvents?: (...args: unknown[]) => unknown;
  addUsefulCallbackInfo?: (...args: unknown[]) => unknown;
  getTotalTime?: () => number;
  getTotalBeats?: () => number;
  getBarLength?: () => number;
  getBeatLength?: () => number;
  getBeatsPerMeasure?: () => number;
  getBpm?: (tempo?: unknown) => number;
  getMeter?: () => unknown;
  getMeterFraction?: () => unknown;
  getPickupLength?: () => number;
  getKeySignature?: () => unknown;
  getElementFromChar?: (charPos: number) => VoiceElement | null;
  makeVoicesArray?: () => VoiceLine[][];
  millisecondsPerMeasure?: (bpm?: number) => number;
  setupEvents?: (...args: unknown[]) => unknown;
  setTiming?: (...args: unknown[]) => void;
  setUpAudio?: (...args: unknown[]) => unknown;
  deline?: () => StaffLine[];
  findSelectableElement?: (...args: unknown[]) => unknown;
  getSelectableArray?: () => unknown[];
  reset(): void;
}

interface TuneBuilderLike extends InstanceType<typeof TuneBuilder> {
  getCurrentVoice(): VoiceLine | undefined;
  setVisualTranspose(value: number | string): void;
  setRunningFont(fontName: string, font?: FontDefinition): void;
  cleanUp(barsPerStaff?: number, staffNoNote?: unknown, openSlurs?: unknown[]): unknown[];
}

interface ElementWithFormatting extends VoiceElement {
  positioning?: Partial<Record<PositioningKey, string>>;
  fonts?: Partial<Record<FontKey, FontDefinition>>;
}

interface MultilineState {
  [key: string]: unknown;
  warnings?: string[];
  warningObjects?: WarningObject[];
  lineBreaks?: number[];
  globalTranspose?: number;
  barNumbers?: number[];
  barsperstaff?: number;
  staffnonote?: unknown;
  openSlurs?: unknown[];
  papersize?: string;
  landscape?: boolean;
  annotationfont?: FontDefinition;
  gchordfont?: FontDefinition;
  tripletfont?: FontDefinition;
  vocalfont?: FontDefinition;
  measurefont?: FontDefinition;
  repeatfont?: FontDefinition;
  iChar: number;
  key: { accidentals: unknown[]; root: string; acc: string; mode: string };
  meter: unknown;
  origMeter: unknown;
  hasMainTitle: boolean;
  default_length: number;
  clef: { type: string; verticalPos: number };
  octave: number;
  next_note_duration: number;
  start_new_line: boolean;
  is_in_header: boolean;
  partForNextLine: Record<string, unknown>;
  tempoForNextLine: unknown[];
  havent_set_length: boolean;
  voices: Record<string, unknown>;
  staves: unknown[];
  macros: Record<string, unknown>;
  currBarNumber: number;
  barCounter: Record<string, unknown>;
  ignoredDecorations: unknown[];
  score_is_present: boolean;
  inEnding: boolean;
  inTie: unknown[];
  inTieChord: Record<string, unknown>;
  vocalPosition: string;
  dynamicPosition: string;
  chordPosition: string;
  ornamentPosition: string;
  volumePosition: string;
  freegchord: boolean;
  endingHoldOver: { inTie?: unknown[]; inTieChord?: Record<string, unknown> };
  reset(): void;
  differentFont(type: FontKey, defaultFonts: Record<string, FontDefinition>): boolean;
  addFormattingOptions(el: ElementWithFormatting, defaultFonts: Record<string, FontDefinition>, elType: 'note' | 'bar'): void;
  duplicateStartEndingHoldOvers(): void;
  restoreStartEndingHoldOvers(): void;
}

const addPositioning = (element: ElementWithFormatting, key: PositioningKey, value: string): void => {
  if (!element.positioning) element.positioning = {};
  element.positioning[key] = value;
};

const addFont = (element: ElementWithFormatting, key: FontKey, value?: FontDefinition): void => {
  if (!value) return;
  if (!element.fonts) element.fonts = {};
  element.fonts[key] = value;
};

const createMultilineState = (): MultilineState => {
  const state: MultilineState = {
    iChar: 0,
    key: { accidentals: [], root: 'none', acc: '', mode: '' },
    meter: null,
    origMeter: null,
    hasMainTitle: false,
    default_length: 0.125,
    clef: { type: 'treble', verticalPos: 0 },
    octave: 0,
    next_note_duration: 0,
    start_new_line: true,
    is_in_header: true,
    partForNextLine: {},
    tempoForNextLine: [],
    havent_set_length: true,
    voices: {},
    staves: [],
    macros: {},
    currBarNumber: 1,
    barCounter: {},
    ignoredDecorations: [],
    score_is_present: false,
    inEnding: false,
    inTie: [],
    inTieChord: {},
    vocalPosition: 'auto',
    dynamicPosition: 'auto',
    chordPosition: 'auto',
    ornamentPosition: 'auto',
    volumePosition: 'auto',
    freegchord: false,
    endingHoldOver: {},
    reset(this: MultilineState) {
      Object.keys(this).forEach((key) => {
        if (typeof (this as Record<string, unknown>)[key] !== 'function') {
          delete (this as Record<string, unknown>)[key];
        }
      });
      this.iChar = 0;
      this.key = { accidentals: [], root: 'none', acc: '', mode: '' };
      this.meter = null;
      this.origMeter = null;
      this.hasMainTitle = false;
      this.default_length = 0.125;
      this.clef = { type: 'treble', verticalPos: 0 };
      this.octave = 0;
      this.next_note_duration = 0;
      this.start_new_line = true;
      this.is_in_header = true;
      this.partForNextLine = {};
      this.tempoForNextLine = [];
      this.havent_set_length = true;
      this.voices = {};
      this.staves = [];
      this.macros = {};
      this.currBarNumber = 1;
      this.barCounter = {};
      this.ignoredDecorations = [];
      this.score_is_present = false;
      this.inEnding = false;
      this.inTie = [];
      this.inTieChord = {};
      this.vocalPosition = 'auto';
      this.dynamicPosition = 'auto';
      this.chordPosition = 'auto';
      this.ornamentPosition = 'auto';
      this.volumePosition = 'auto';
      this.openSlurs = [];
      this.freegchord = false;
      this.endingHoldOver = {};
      this.warnings = undefined;
      this.warningObjects = undefined;
    },
    differentFont(this: MultilineState, type: FontKey, defaultFonts: Record<string, FontDefinition>) {
      const customFont = this[type] as FontDefinition | undefined;
      const defaultFont = defaultFonts[type];
      if (!customFont || !defaultFont) return false;
      return (
        customFont.decoration !== defaultFont.decoration ||
        customFont.face !== defaultFont.face ||
        customFont.size !== defaultFont.size ||
        customFont.style !== defaultFont.style ||
        customFont.weight !== defaultFont.weight
      );
    },
    addFormattingOptions(
      this: MultilineState,
      el: ElementWithFormatting,
      defaultFonts: Record<string, FontDefinition>,
      elType: 'note' | 'bar',
    ) {
      if (elType === 'note') {
        if (this.vocalPosition !== 'auto') addPositioning(el, 'vocalPosition', this.vocalPosition);
        if (this.dynamicPosition !== 'auto') addPositioning(el, 'dynamicPosition', this.dynamicPosition);
        if (this.chordPosition !== 'auto') addPositioning(el, 'chordPosition', this.chordPosition);
        if (this.ornamentPosition !== 'auto') addPositioning(el, 'ornamentPosition', this.ornamentPosition);
        if (this.volumePosition !== 'auto') addPositioning(el, 'volumePosition', this.volumePosition);
        if (this.differentFont('annotationfont', defaultFonts)) addFont(el, 'annotationfont', this.annotationfont);
        if (this.differentFont('gchordfont', defaultFonts)) addFont(el, 'gchordfont', this.gchordfont);
        if (this.differentFont('vocalfont', defaultFonts)) addFont(el, 'vocalfont', this.vocalfont);
        if (this.differentFont('tripletfont', defaultFonts)) addFont(el, 'tripletfont', this.tripletfont);
      } else if (elType === 'bar') {
        if (this.dynamicPosition !== 'auto') addPositioning(el, 'dynamicPosition', this.dynamicPosition);
        if (this.chordPosition !== 'auto') addPositioning(el, 'chordPosition', this.chordPosition);
        if (this.ornamentPosition !== 'auto') addPositioning(el, 'ornamentPosition', this.ornamentPosition);
        if (this.volumePosition !== 'auto') addPositioning(el, 'volumePosition', this.volumePosition);
        if (this.differentFont('measurefont', defaultFonts)) addFont(el, 'measurefont', this.measurefont);
        if (this.differentFont('repeatfont', defaultFonts)) addFont(el, 'repeatfont', this.repeatfont);
      }
    },
    duplicateStartEndingHoldOvers(this: MultilineState) {
      const holdOver: { inTie: unknown[][]; inTieChord: Record<string, unknown> } = {
        inTie: [],
        inTieChord: {},
      };
      const ties = this.inTie as unknown[];
      for (let i = 0; i < ties.length; i += 1) {
        const entry = ties[i];
        if (!entry) {
          holdOver.inTie[i] = [];
          continue;
        }
        holdOver.inTie[i] = Array.isArray(entry) ? [...entry] : [entry];
      }
      const tieChord = this.inTieChord as Record<string, unknown>;
      Object.keys(tieChord).forEach((key) => {
        holdOver.inTieChord[key] = tieChord[key];
      });
      this.endingHoldOver = holdOver;
    },
    restoreStartEndingHoldOvers(this: MultilineState) {
      const holdOver = this.endingHoldOver;
      if (!holdOver.inTie) return;
      this.inTie = holdOver.inTie.map((entry) => (Array.isArray(entry) ? [...entry] : [entry]));
      this.inTieChord = { ...holdOver.inTieChord };
    },
  };

  state.reset();
  return state;
};

const cloneElement = (element: VoiceElement): VoiceElement => ({ ...element });

const sanitizeWords = (value: string): string => parseCommon.strip(value);

const flushLatex = (content: string): string => {
  const parts = content.split('\n\\');
  if (parts.length === 1) return content;
  for (let i = 1; i < parts.length; i += 1) {
    while (parts[i].length > 0 && parts[i][0] !== '\n') {
      parts[i] = parts[i].substring(1);
      parts[i - 1] += ' ';
    }
  }
  return parts.join('  ');
};

const normalizeContinuations = (content: string): string =>
  content.replace(/\\([ \t]*)(%.*)*\n/g, (match, backslash: string, comment?: string) => {
    const padding = comment ? ' '.repeat(comment.length) : '';
    return `${backslash}${CONTINUATION_CHAR}${padding}\n`;
  });

const isRenderableElement = (element: VoiceElement): boolean =>
  element.el_type === 'note' && !element.rest && element.pitches !== null;

class AbcParser {
  private readonly tune: TuneLike;

  private readonly tuneBuilder: TuneBuilderLike;

  private tokenizer?: TokenizerLike;

  private header?: HeaderParser;

  private music?: MusicParser;

  private wordsContinuation = '';

  private symbolContinuation = '';

  private readonly multilineVars: MultilineState;

  constructor() {
    this.tune = new (Tune as unknown as { new (): TuneLike })();
    this.tuneBuilder = new (TuneBuilder as unknown as { new (tune: TuneLike): TuneBuilderLike })(this.tune);
    this.multilineVars = createMultilineState();
  }

  public getTune(): TuneLike {
    return this.tune;
  }

  public getWarnings(): string[] | undefined {
    return this.multilineVars.warnings as string[] | undefined;
  }

  public getWarningObjects(): WarningObject[] | undefined {
    return this.multilineVars.warningObjects as WarningObject[] | undefined;
  }

  public parse(strTune: string, switches: ParserSwitches = {}, startPos = 0): void {
    this.tune.reset();
    this.wordsContinuation = '';
    this.symbolContinuation = '';

    let normalized = `${strTune.replace(/\r\n?/g, '\n')}\n`;
    normalized = flushLatex(normalized);
    normalized = normalizeContinuations(normalized);

    const lines = normalized.split('\n');
    if (parseCommon.last(lines)?.length === 0) {
      lines.pop();
    }

    this.tokenizer = new Tokenizer(lines, this.multilineVars);
    const warnHandler: WarnHandler = (message, line, column) => this.warn(message, line, column);
    this.header = new ParseHeader(this.tokenizer, warnHandler, this.multilineVars, this.tune, this.tuneBuilder) as HeaderParser;
    this.music = new ParseMusic(
      this.tokenizer,
      warnHandler,
      this.multilineVars,
      this.tune,
      this.tuneBuilder,
      this.header,
    ) as MusicParser;

    if (switches.print) {
      this.tune.media = 'print';
    }

    this.multilineVars.reset();
    this.multilineVars.iChar = startPos;

    if (switches.visualTranspose !== undefined) {
      const transposeValue = typeof switches.visualTranspose === 'number'
        ? switches.visualTranspose
        : parseInt(String(switches.visualTranspose), 10);
      if (Number.isFinite(transposeValue) && transposeValue !== 0) {
        this.multilineVars.globalTranspose = transposeValue;
        this.tuneBuilder.setVisualTranspose(transposeValue);
      } else {
        this.multilineVars.globalTranspose = undefined;
      }
    } else {
      this.multilineVars.globalTranspose = undefined;
    }

    if (switches.lineBreaks) {
      this.multilineVars.lineBreaks = switches.lineBreaks.slice();
    }

    this.header.reset(this.tokenizer, warnHandler, this.multilineVars, this.tune);

    try {
      if (switches.format) {
        parseDirective.globalFormatting(switches.format);
      }

      let line = this.tokenizer.nextLine();
      while (line) {
        if (switches.header_only && this.multilineVars.is_in_header === false) {
          throw NORMAL_ABORT;
        }
        if (switches.stop_on_warning && this.multilineVars.warnings?.length) {
          throw NORMAL_ABORT;
        }

        const wasInHeader = Boolean(this.multilineVars.is_in_header);
        this.parseLine(line);
        if (wasInHeader && !this.multilineVars.is_in_header) {
          this.tuneBuilder.setRunningFont('annotationfont', this.multilineVars.annotationfont);
          this.tuneBuilder.setRunningFont('gchordfont', this.multilineVars.gchordfont);
          this.tuneBuilder.setRunningFont('tripletfont', this.multilineVars.tripletfont);
          this.tuneBuilder.setRunningFont('vocalfont', this.multilineVars.vocalfont);
        }
        line = this.tokenizer.nextLine();
      }

      if (this.wordsContinuation) {
        this.addWords(this.tuneBuilder.getCurrentVoice(), '');
      }
      if (this.symbolContinuation) {
        this.addSymbols(this.tuneBuilder.getCurrentVoice(), '');
      }

      const cleanedSlurs = this.tuneBuilder.cleanUp(
        this.multilineVars.barsperstaff as number | undefined,
        this.multilineVars.staffnonote,
        this.multilineVars.openSlurs as unknown[] | undefined,
      );
      this.multilineVars.openSlurs = cleanedSlurs as unknown[];
    } catch (error) {
      if (error !== NORMAL_ABORT) {
        throw error;
      }
    }

    const page = this.resolvePageDimensions();
    if (!this.tune.formatting.pagewidth) {
      this.tune.formatting.pagewidth = page.width;
    }
    if (!this.tune.formatting.pageheight) {
      this.tune.formatting.pageheight = page.height;
    }

    if (switches.hint_measures) {
      this.addHintMeasures();
    }

    wrap.wrapLines(this.tune, this.multilineVars.lineBreaks, this.multilineVars.barNumbers);
  }

  private resolvePageDimensions(): { width: number; height: number } {
    const sizeKey = this.multilineVars.papersize as string | undefined;
    const base =
      sizeKey && LANDSCAPE_DIMENSIONS[sizeKey]
        ? { ...LANDSCAPE_DIMENSIONS[sizeKey] }
        : { width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT };

    if (this.multilineVars.landscape) {
      return { width: base.height, height: base.width };
    }
    return base;
  }

  private parseLine(line: string): void {
    if (parseCommon.startsWith(line, '%%')) {
      const err = parseDirective.addDirective(line.substring(2));
      if (err) this.warn(err, line, 2);
      return;
    }

    const commentIndex = line.indexOf('%');
    if (commentIndex >= 0) {
      line = line.substring(0, commentIndex);
    }
    line = line.replace(/\s+$/, '');

    if (line.length === 0) return;

    if (this.wordsContinuation) {
      this.addWords(this.tuneBuilder.getCurrentVoice(), line.substring(2));
      return;
    }
    if (this.symbolContinuation) {
      this.addSymbols(this.tuneBuilder.getCurrentVoice(), line.substring(2));
      return;
    }

    if (line.length < 2 || line[1] !== ':' || this.music?.lineContinuation) {
      this.music?.parseMusic(line);
      return;
    }

    const result = this.header?.parseHeader(line);
    if (result?.regular) {
      this.music?.parseMusic(line);
    }
    if (result?.newline) {
      this.music?.startNewLine();
    }
    if (result?.words) {
      this.addWords(this.tuneBuilder.getCurrentVoice(), line.substring(2));
    }
    if (result?.symbols) {
      this.addSymbols(this.tuneBuilder.getCurrentVoice(), line.substring(2));
    }
  }

  private addWords(line: VoiceLine | undefined, input: string): void {
    if (input.includes(CONTINUATION_CHAR)) {
      this.wordsContinuation += input;
      return;
    }

    let words = `${this.wordsContinuation}${input}`;
    this.wordsContinuation = '';

    if (!line) {
      this.warn("Can't add words before the first line of music", input, 0);
      return;
    }

    words = sanitizeWords(words);
    if (!words.endsWith('-')) {
      words += ' ';
    }

    const lyricTokens: LyricToken[] = [];
    let lastDivider = 0;
    let replaceMarker = false;
    let escapeNext = false;

    const pushWord = (index: number): boolean => {
      const rawWord = words.substring(lastDivider, index);
      lastDivider = index + 1;
      const cleanWord = sanitizeWords(rawWord);
      if (!cleanWord.length) return false;
      const formatted = replaceMarker ? cleanWord.replace(/~/g, ' ') : cleanWord;
      replaceMarker = false;
      const divider = ['_', '-'].includes(words[index]) ? words[index] : ' ';
      lyricTokens.push({ syllable: this.tokenizer?.translateString(formatted), divider });
      return true;
    };

    for (let i = 0; i < words.length; i += 1) {
      const char = words[i];
      switch (char) {
        case ' ':
        case CONTINUATION_CHAR:
          pushWord(i);
          break;
        case '-':
          if (!escapeNext && !pushWord(i) && lyricTokens.length > 0) {
            const last = parseCommon.last(lyricTokens);
            if (last) last.divider = '-';
            lyricTokens.push({ skip: true, to: LyricSkipTarget.Next });
          }
          break;
        case '_':
          if (!escapeNext && pushWord(i)) {
            lyricTokens.push({ skip: true, to: LyricSkipTarget.Slur });
          }
          break;
        case '*':
          if (!escapeNext && pushWord(i)) {
            lyricTokens.push({ skip: true, to: LyricSkipTarget.Next });
          }
          break;
        case '|':
          if (!escapeNext && pushWord(i)) {
            lyricTokens.push({ skip: true, to: LyricSkipTarget.Bar });
          }
          break;
        case '~':
          if (!escapeNext) {
            replaceMarker = true;
          }
          break;
        default:
          break;
      }
      escapeNext = char === '\\';
    }

    this.applyLyrics(line, lyricTokens);
  }

  private addSymbols(line: VoiceLine | undefined, input: string): void {
    if (input.includes(CONTINUATION_CHAR)) {
      this.symbolContinuation += input;
      return;
    }

    let words = `${this.symbolContinuation}${input}`;
    this.symbolContinuation = '';

    if (!line) {
      this.warn("Can't add symbols before the first line of music", input, 0);
      return;
    }

    words = sanitizeWords(words);
    if (!words.endsWith('-')) {
      words += ' ';
    }

    const lyricTokens: LyricToken[] = [];
    let lastDivider = 0;
    let replaceMarker = false;

    const pushWord = (index: number): boolean => {
      const rawWord = words.substring(lastDivider, index);
      lastDivider = index + 1;
      const cleanWord = sanitizeWords(rawWord);
      if (!cleanWord.length) return false;
      const formatted = replaceMarker ? cleanWord.replace(/~/g, ' ') : cleanWord;
      replaceMarker = false;
      const divider = ['_', '-'].includes(words[index]) ? words[index] : ' ';
      lyricTokens.push({ syllable: this.tokenizer?.translateString(formatted), divider });
      return true;
    };

    for (let i = 0; i < words.length; i += 1) {
      const char = words[i];
      switch (char) {
        case ' ':
        case CONTINUATION_CHAR:
          pushWord(i);
          break;
        case '-':
          if (!pushWord(i) && lyricTokens.length > 0) {
            const last = parseCommon.last(lyricTokens);
            if (last) last.divider = '-';
            lyricTokens.push({ skip: true, to: LyricSkipTarget.Next });
          }
          break;
        case '_':
          if (pushWord(i)) {
            lyricTokens.push({ skip: true, to: LyricSkipTarget.Slur });
          }
          break;
        case '*':
          if (pushWord(i)) {
            lyricTokens.push({ skip: true, to: LyricSkipTarget.Next });
          }
          break;
        case '|':
          if (pushWord(i)) {
            lyricTokens.push({ skip: true, to: LyricSkipTarget.Bar });
          }
          break;
        case '~':
          replaceMarker = true;
          break;
        default:
          break;
      }
    }

    this.applyLyrics(line, lyricTokens);
  }

  private applyLyrics(line: VoiceLine, lyrics: LyricToken[]): void {
    if (!lyrics.length) return;
    let inSlur = false;

    line.forEach((element) => {
      if (!lyrics.length) return;
      const next = lyrics[0];
      if (next.skip) {
        const shouldAdvance =
          (next.to === LyricSkipTarget.Next && isRenderableElement(element) && !inSlur) ||
          (next.to === LyricSkipTarget.Slur && isRenderableElement(element)) ||
          (next.to === LyricSkipTarget.Bar && element.el_type === 'bar');
        if (shouldAdvance) {
          lyrics.shift();
        }
        if (element.el_type !== 'bar') {
          if (!element.lyric) element.lyric = [];
          element.lyric.push({ syllable: '', divider: ' ' });
        }
        return;
      }

      if (isRenderableElement(element) && !inSlur) {
        const lyric = lyrics.shift();
        if (!lyric) return;
        if (lyric.syllable) {
          lyric.syllable = lyric.syllable.replace(/ +/g, '\u00A0');
        }
        if (!element.lyric) element.lyric = [];
        element.lyric.push(lyric);
      }
    });
  }

  private appendLastMeasure(voice: VoiceLine, nextVoice: VoiceLine): void {
    voice.push({ el_type: 'hint' });
    for (const element of nextVoice) {
      const hint = cloneElement(element);
      voice.push(hint);
      if (element.el_type === 'bar') return;
    }
  }

  private addHintMeasure(staff: StaffVoice[], nextStaff: StaffVoice[]): void {
    for (let i = 0; i < staff.length; i += 1) {
      const stave = staff[i];
      const following = nextStaff[i];
      if (!following) continue;
      for (let j = 0; j < following.voices.length; j += 1) {
        const nextVoice = following.voices[j];
        const currentVoice = stave.voices[j];
        if (currentVoice) {
          this.appendLastMeasure(currentVoice, nextVoice);
        }
      }
    }
  }

  private addHintMeasures(): void {
    for (let i = 0; i < this.tune.lines.length; i += 1) {
      const currentLine = this.tune.lines[i].staff;
      if (!currentLine) continue;
      let j = i + 1;
      while (j < this.tune.lines.length && this.tune.lines[j].staff === undefined) {
        j += 1;
      }
      if (j < this.tune.lines.length) {
        const nextLine = this.tune.lines[j].staff;
        if (nextLine) {
          this.addHintMeasure(currentLine, nextLine);
        }
      }
    }
  }

  private addWarning(message: string): void {
    if (!this.multilineVars.warnings) {
      this.multilineVars.warnings = [];
    }
    (this.multilineVars.warnings as string[]).push(message);
  }

  private addWarningObject(warning: WarningObject): void {
    if (!this.multilineVars.warningObjects) {
      this.multilineVars.warningObjects = [];
    }
    (this.multilineVars.warningObjects as WarningObject[]).push(warning);
  }

  private warn(message: string, line: string, column: number): void {
    if (!line) line = ' ';
    const badChar = line[column] ?? 'SPACE';
    const cleanLine = `${this.encode(line.substring(column - 64, column))}<span style="text-decoration:underline;font-size:1.3em;font-weight:bold;">${badChar}</span>${this.encode(
      line.substring(column + 1, column + 65),
    )}`;
    const lineIndex = this.tokenizer ? this.tokenizer.lineIndex : 0;
    this.addWarning(`Music Line:${lineIndex}:${column + 1}: ${message}:  ${cleanLine}`);
    this.addWarningObject({
      message,
      line,
      startChar: (this.multilineVars.iChar || 0) + column,
      column,
    });
  }

  private encode(str: string): string {
    return str
      .replace(/\x12/g, ' ')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export default AbcParser;
