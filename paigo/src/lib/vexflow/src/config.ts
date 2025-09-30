import { Tables } from './tables';
import type { BarlineOptions } from './stavebarline';
import type { ElementStyle } from './element';
import type { StaveLineConfig } from './stave';
import type { FontInfo } from './font';

type Primitive = string | number | boolean | null | undefined;

type DeepPartialArray<T> = Array<DeepPartial<T>>;

export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends (infer U)[]
  ? DeepPartialArray<U>
  : { [K in keyof T]?: DeepPartial<T[K]> };

const isPlainObject = (value: unknown): value is Record<string | number | symbol, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const clone = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T;
  }
  if (isPlainObject(value)) {
    const output: Record<string | number | symbol, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = clone(entry);
    }
    return output as T;
  }
  return value;
};

const merge = <T>(base: T, overrides?: DeepPartial<T>): T => {
  const result = clone(base);
  if (!overrides || !isPlainObject(overrides) && !Array.isArray(overrides)) {
    return overrides !== undefined ? (clone(overrides as T) ?? result) : result;
  }

  if (Array.isArray(result)) {
    return (Array.isArray(overrides) ? overrides.map((item) => clone(item)) : result) as T;
  }

  const target = result as Record<string | number | symbol, unknown>;
  const source = overrides as Record<string | number | symbol, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    const current = target[key];
    if (Array.isArray(value)) {
      target[key] = value.map((item) => clone(item));
    } else if (isPlainObject(value) && isPlainObject(current)) {
      target[key] = merge(current as Record<string, unknown>, value as DeepPartial<Record<string, unknown>>);
    } else {
      target[key] = clone(value);
    }
  }

  return result;
};

export interface StaveConfigValues {
  spacingBetweenLinesPx: number;
  spaceAboveStaffLn: number;
  spaceBelowStaffLn: number;
  topTextPosition: number;
  bottomTextPosition: number;
  verticalBarWidth: number;
  numLines: number;
  stillCursor: boolean;
  lineConfig: StaveLineConfig[];
  leftBar: BarlineOptions;
  rightBar: BarlineOptions;
  style: ElementStyle;
  fontSize: number;
  padding: number;
  paddingLeft: number;
  paddingRight: number;
  endPaddingMax: number;
  endPaddingMin: number;
  unalignedNotePadding: number;
}

export interface ClefConfigEntry {
  size?: string;
  annotation?: string;
  style?: ElementStyle;
}

export interface ClefConfigValues {
  defaults: ClefConfigEntry;
  types: Record<string, ClefConfigEntry>;
}

export interface StemConfigValues {
  width: number;
  height: number;
  strokeStyle: string,
  lineWidth: number,
}

export interface NoteHeadConfigValues {
  minPadding: number,
  pointerRect: boolean,
}

export interface VexflowConfigShape {
  pointerRect: boolean,
  fontFamily: string,
  fontSize: number,
  fontScale: number,
  fontWeight: string,
  fontStyle: string,
  tempo: number,
  Stave: StaveConfigValues;
  Clef: ClefConfigValues;
  Stem: StemConfigValues;
  NoteHead: NoteHeadConfigValues,
}

const DEFAULT_CONFIG: VexflowConfigShape = {
  pointerRect: false,
  fontFamily: 'Bravura,Academico',
  fontSize: 30,
  fontScale: 1.0,
  fontWeight: 'normal',
  fontStyle: 'normal',
  tempo: 60,
  Stave: {
    spacingBetweenLinesPx: Tables.STAVE_LINE_DISTANCE,
    spaceAboveStaffLn: 4,
    spaceBelowStaffLn: 4,
    topTextPosition: 1,
    bottomTextPosition: 4,
    verticalBarWidth: 10,
    numLines: 5,
    stillCursor: false,
    lineConfig: [],
    leftBar: {},
    rightBar: {},
    style: {
      shadowColor: 'black',
      shadowBlur: 0,
      fillStyle: 'black',
      strokeStyle: 'black',
      lineWidth: 1,
      lineDash: 'none',
    },
    fontSize: 8,
    padding: 0,
    paddingLeft: 0,
    paddingRight: 0,
    endPaddingMax: 0,
    endPaddingMin: 0,
    unalignedNotePadding: 10,
  },
  Clef: {
    defaults: {
      size: 'default',
    },
    types: {},
  },
  Stem: {
    width: 1.5,
    height: 35,
    strokeStyle: 'black',
    lineWidth: 1,
  },
  NoteHead: {
    minPadding: 0,
    pointerRect: false,
  },
};

export class VexflowConfigInstance {
  private cached?: VexflowConfigShape;
  protected cacheStyle = new Map<string, ElementStyle>();
  protected cacheFont = new Map<string, Required<FontInfo>>();

  constructor(
    private parent: VexflowConfigInstance | null,
    private overrides?: DeepPartial<VexflowConfigShape>,
  ) { }

  private resolve(): VexflowConfigShape {
    if (!this.cached) {
      const base = this.parent ? this.parent.resolve() : clone(DEFAULT_CONFIG);
      this.cached = this.overrides
        ? merge<VexflowConfigShape>(base, this.overrides)
        : base;
    }
    return this.cached;
  }

  fork(overrides?: DeepPartial<VexflowConfigShape>): VexflowConfigInstance {
    return new VexflowConfigInstance(this, overrides);
  }

  setTempo(tempo: number): void {
    const safeTempo = Number.isFinite(tempo) && tempo > 0 ? tempo : DEFAULT_CONFIG.tempo;
    const overrides =
      this.overrides && isPlainObject(this.overrides)
        ? { ...(this.overrides as Record<string, unknown>) }
        : {};
    overrides.tempo = safeTempo;
    this.overrides = overrides as DeepPartial<VexflowConfigShape>;
    this.cached = undefined;
    this.cacheStyle.clear();
    this.cacheFont.clear();
  }

  stave(overrides?: DeepPartial<StaveConfigValues>): StaveConfigValues {
    const base = this.resolve().Stave;
    if (!overrides) return base;
    return merge<StaveConfigValues>(base, overrides);
  }

  clef(type: string, overrides?: DeepPartial<ClefConfigEntry>): ClefConfigEntry {
    const base = this.resolve().Clef;
    const typeDefaults = base.types[type] ?? {};
    const withType = merge<ClefConfigEntry>(base.defaults, typeDefaults);
    if (!overrides) return withType;
    return merge<ClefConfigEntry>(withType, overrides);
  }

  stem(overrides?: DeepPartial<StemConfigValues>): StemConfigValues {
    const base = this.resolve().Stem;
    if (!overrides) return base;
    return merge<StemConfigValues>(base, overrides);
  }

  /**
   * Use the provided key to look up a value in CommonMetrics.
   *
   * @param key is a string separated by periods (e.g., `Stroke.text.fontFamily`).
   * @param defaultValue is returned if the lookup fails.
   * @returns the retrieved value (or `defaultValue` if the lookup fails).
   *
   * For the key `Stroke.text.fontFamily`, check all of the following in order:
   *   1) CommonMetrics.fontFamily
   *   2) CommonMetrics.Stroke.fontFamily
   *   3) CommonMetrics.Stroke.text.fontFamily
   * Retrieve the value from the most specific key (i.e., prefer #3 over #2 over #1 in the above example).
   */
  // eslint-disable-next-line
  get(key: string, defaultValue?: any): any {
    const keyParts = key.split('.');
    const lastKeyPart = keyParts.pop()!; // Use ! because keyParts is not empty, since ''.split('.') still returns [''].

    // Start from root of CommonMetrics and go down as far as possible.
    let curr: unknown = this.resolve();
    let retVal = defaultValue;

    while (curr && typeof curr === 'object') {
      const currentRecord = curr as Record<string, unknown>;
      // Update retVal whenever we find a value assigned to a more specific key.
      retVal = currentRecord[lastKeyPart] ?? retVal;
      const keyPart = keyParts.shift();
      if (keyPart) {
        curr = currentRecord[keyPart]; // Go down one level.
      } else {
        break;
      }
    }

    return retVal;
  }

  getFontInfo(key: string): Required<FontInfo> {
    let font = this.cacheFont.get(key);
    if (!font) {
      const family = this.get(`${key}.fontFamily`, this.get('fontFamily'));
      const fontSize = this.get(`${key}.fontSize`, this.get('fontSize'));
      const fontScale = this.get(`${key}.fontScale`, this.get('fontScale'));
      const weight = this.get(`${key}.fontWeight`, this.get('fontWeight'));
      const style = this.get(`${key}.fontStyle`, this.get('fontStyle'));
      font = {
        family,
        size: fontSize * fontScale,
        weight,
        style,
      };
      this.cacheFont.set(key, font);
    }
    return structuredClone(font);
  }

  getStyle(key: string): ElementStyle {
    let style = this.cacheStyle.get(key);
    if (!style) {
      style = {
        fillStyle: this.get(`${key}.fillStyle`),
        strokeStyle: this.get(`${key}.strokeStyle`),
        lineWidth: this.get(`${key}.lineWidth`),
        lineDash: this.get(`${key}.lineDash`),
        shadowBlur: this.get(`${key}.shadowBlur`),
        shadowColor: this.get(`${key}.shadowColor`),
      };
      this.cacheStyle.set(key, style);
    }
    return structuredClone(style);
  }
}

let globalConfig = new VexflowConfigInstance(null, undefined);

export const VexflowConfig = {
  defaults(): VexflowConfigInstance {
    return globalConfig;
  },
  configure(overrides?: DeepPartial<VexflowConfigShape>): VexflowConfigInstance {
    globalConfig = new VexflowConfigInstance(globalConfig, overrides);
    return globalConfig;
  },
  create(
    overrides?: DeepPartial<VexflowConfigShape>,
    parent?: VexflowConfigInstance,
  ): VexflowConfigInstance {
    return (parent ?? globalConfig).fork(overrides);
  },
  reset(): void {
    globalConfig = new VexflowConfigInstance(null, undefined);
  },
};

export type { VexflowConfigShape as VexflowConfigValues };
