import { Tables } from './tables';
import type { BarlineOptions } from './stavebarline';
import type { ElementStyle } from './element';
import type { StaveLineConfig } from './stave';

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
  metrics: {
    strokeStyle: string;
    fontSize: number;
    padding: number;
    endPaddingMax: number;
    endPaddingMin: number;
    unalignedNotePadding: number;
  };
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
}

export interface VexflowConfigShape {
  fontSize: number,
  stave: StaveConfigValues;
  clef: ClefConfigValues;
  stem: StemConfigValues;
}

const DEFAULT_CONFIG: VexflowConfigShape = {
  fontSize: 30,
  stave: {
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
    style: {},
    metrics: {
      strokeStyle: '#999999',
      fontSize: 8,
      padding: 0,
      endPaddingMax: 0,
      endPaddingMin: 0,
      unalignedNotePadding: 10,
    },
  },
  clef: {
    defaults: {
      size: 'default',
    },
    types: {},
  },
  stem: {
    width: 1.5,
    height: 35,
  },
};

export class VexflowConfigInstance {
  private cached?: VexflowConfigShape;

  constructor(
    private parent: VexflowConfigInstance | null,
    private overrides?: DeepPartial<VexflowConfigShape>,
  ) {}

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

  stave(overrides?: DeepPartial<StaveConfigValues>): StaveConfigValues {
    const base = this.resolve().stave;
    if (!overrides) return base;
    return merge<StaveConfigValues>(base, overrides);
  }

  clef(type: string, overrides?: DeepPartial<ClefConfigEntry>): ClefConfigEntry {
    const base = this.resolve().clef;
    const typeDefaults = base.types[type] ?? {};
    const withType = merge<ClefConfigEntry>(base.defaults, typeDefaults);
    if (!overrides) return withType;
    return merge<ClefConfigEntry>(withType, overrides);
  }

  stem(overrides?: DeepPartial<StemConfigValues>): StemConfigValues {
    const base = this.resolve().stem;
    if (!overrides) return base;
    return merge<StemConfigValues>(base, overrides);
  }

  get fontSize(): number {
    return this.resolve().fontSize;
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
