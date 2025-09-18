import {
  Metrics,
  MetricsDefaults,
  Renderer,
  VexFlow,
  type BarlineOptions,
  type ElementStyle,
  type StaveLineConfig,
  type StaveOptions,
} from './vexflow-core';

export interface VexflowMetricOverrides {
  stemWidth?: number;
  stemHeight?: number;
  /**
   * Keys are dot-separated paths into VexFlow's MetricsDefaults object.
   * Examples: `fontSize`, `Stave.strokeStyle`, `Stave.padding`.
   */
  metrics?: Record<string, unknown>;
}

export interface VexflowRendererConfig {
  backend: number;
  width: number;
  height: number;
}

export interface VexflowClefConfig {
  width: number;
  type: Parameters<typeof VexFlow.Stave.prototype.addClef>[0];
  options?: Parameters<typeof VexFlow.Stave.prototype.addClef>[1];
  staveOverrides?: Partial<StaveOptions>;
}

export interface VexflowStaffConfig {
  measureWidth: number;
  staveHeight: number;
  spacingBetweenLinesPx: number;
  staveStyle: Partial<StaveOptions>;
  clef: VexflowClefConfig;
  renderer: VexflowRendererConfig;
  metrics?: VexflowMetricOverrides;
}

const defaultStaveStyle: StaveOptions = {
  numLines: 5,
  spacingBetweenLinesPx: 20,
  spaceAboveStaffLn: 2,
  spaceBelowStaffLn: 2,
  style: {
    lineWidth: 3,
    strokeStyle: '#dadada',
  },
  leftBar: {
    width: 3,
    style: {
      fillStyle: '#dadada',
    },
  },
  rightBar: {
    width: 3,
    style: {
      fillStyle: '#dadada',
    },
  },
};

const defaultClefConfig: VexflowClefConfig = {
  width: 120,
  type: 'treble',
  options: {
    style: {
      fillStyle: '#afafaf',
    },
  },
  staveOverrides: {
    stillCursor: true,
  },
};

const defaultRendererConfig: VexflowRendererConfig = {
  backend: Renderer.Backends.SVG,
  width: 30000,
  height: 180,
};

const baseStaffConfig: VexflowStaffConfig = {
  measureWidth: 288,
  staveHeight: 180,
  spacingBetweenLinesPx: 20,
  staveStyle: defaultStaveStyle,
  clef: defaultClefConfig,
  renderer: defaultRendererConfig,
  metrics: {
    stemWidth: 3,
    stemHeight: 70,
    metrics: {
      fontSize: 60,
    },
  },
};

export interface ResolvedVexflowClefConfig
  extends Omit<VexflowClefConfig, 'staveOverrides'> {
  staveOverrides: StaveOptions;
}

export interface ResolvedVexflowStaffConfig
  extends Omit<VexflowStaffConfig, 'staveStyle' | 'clef'> {
  staveStyle: StaveOptions;
  clef: ResolvedVexflowClefConfig;
}

const mergeElementStyle = (
  base: ElementStyle | undefined,
  override: ElementStyle | undefined,
): ElementStyle | undefined => {
  if (base && override) return { ...base, ...override };
  if (override) return { ...override };
  if (base) return { ...base };
  return undefined;
};

const cloneLineConfig = (lineConfig: StaveLineConfig[] | undefined) =>
  lineConfig ? lineConfig.map((line) => ({ ...line })) : undefined;

const mergeBarlineOptions = (
  base: BarlineOptions | undefined,
  override: BarlineOptions | undefined,
): BarlineOptions | undefined => {
  if (!base && !override) return undefined;
  if (!override) {
    if (!base) return undefined;
    return {
      ...base,
      style: mergeElementStyle(base.style, undefined),
    };
  }
  const merged: BarlineOptions = {
    ...(base ?? {}),
    ...override,
  };
  const style = mergeElementStyle(base?.style, override.style);
  if (style) merged.style = style;
  else delete merged.style;
  return merged;
};

const mergeStaveOptions = (base: StaveOptions, override?: Partial<StaveOptions>): StaveOptions => {
  const merged: StaveOptions = {
    ...base,
    style: mergeElementStyle(base.style, undefined),
    leftBar: mergeBarlineOptions(base.leftBar, undefined),
    rightBar: mergeBarlineOptions(base.rightBar, undefined),
    lineConfig: cloneLineConfig(base.lineConfig),
  } as StaveOptions;

  if (!override) return merged;

  const assign = <K extends keyof StaveOptions>(key: K, value: StaveOptions[K] | undefined) => {
    if (value !== undefined) {
      (merged as StaveOptions)[key] = value;
    }
  };

  assign('bottomTextPosition', override.bottomTextPosition);
  assign('spaceBelowStaffLn', override.spaceBelowStaffLn);
  assign('spaceAboveStaffLn', override.spaceAboveStaffLn);
  assign('topTextPosition', override.topTextPosition);
  assign('verticalBarWidth', override.verticalBarWidth);
  assign('numLines', override.numLines);
  assign('spacingBetweenLinesPx', override.spacingBetweenLinesPx);
  assign('stillCursor', override.stillCursor);
  assign('lineConfig', cloneLineConfig(override.lineConfig) ?? merged.lineConfig);

  if (override.style !== undefined) {
    merged.style = mergeElementStyle(merged.style, override.style);
  }

  if (override.leftBar !== undefined) {
    merged.leftBar = mergeBarlineOptions(merged.leftBar, override.leftBar);
  }

  if (override.rightBar !== undefined) {
    merged.rightBar = mergeBarlineOptions(merged.rightBar, override.rightBar);
  }

  return merged;
};

export const resolveStaffConfig = (
  overrides?: Partial<VexflowStaffConfig>,
): ResolvedVexflowStaffConfig => {
  const spacing =
    overrides?.spacingBetweenLinesPx ?? baseStaffConfig.spacingBetweenLinesPx;
  const measureWidth = overrides?.measureWidth ?? baseStaffConfig.measureWidth;
  const staveHeight =
    overrides?.staveHeight ?? overrides?.renderer?.height ?? baseStaffConfig.staveHeight;
  const numLines = overrides?.staveStyle?.numLines ?? defaultStaveStyle.numLines ?? 5;

  const derivedPadding = (() => {
    const raw = (staveHeight - spacing * (numLines - 1)) / (2 * spacing);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.floor(raw));
  })();

  const mergedStaveStyle = mergeStaveOptions(
    defaultStaveStyle,
    {
      ...overrides?.staveStyle,
      spacingBetweenLinesPx: spacing,
      spaceAboveStaffLn: overrides?.staveStyle?.spaceAboveStaffLn ?? derivedPadding,
      spaceBelowStaffLn: overrides?.staveStyle?.spaceBelowStaffLn ?? derivedPadding,
    },
  );

  const defaultClefStave = mergeStaveOptions(defaultStaveStyle, {
    ...defaultClefConfig.staveOverrides,
    spacingBetweenLinesPx: spacing,
    spaceAboveStaffLn:
      overrides?.clef?.staveOverrides?.spaceAboveStaffLn ?? derivedPadding,
    spaceBelowStaffLn:
      overrides?.clef?.staveOverrides?.spaceBelowStaffLn ?? derivedPadding,
  });

  type ClefOptions = Record<string, unknown> & { style?: ElementStyle };
  const baseClefOptions = (defaultClefConfig.options ?? {}) as ClefOptions;
  const overrideClefOptions = (overrides?.clef?.options ?? {}) as ClefOptions;
  const mergedClefOptions = { ...baseClefOptions, ...overrideClefOptions } as ClefOptions;
  const mergedClefStyle = mergeElementStyle(baseClefOptions.style, overrideClefOptions.style);
  if (mergedClefStyle) {
    mergedClefOptions.style = mergedClefStyle;
  } else {
    delete mergedClefOptions.style;
  }

  const clef: ResolvedVexflowClefConfig = {
    ...defaultClefConfig,
    ...overrides?.clef,
    options: mergedClefOptions,
    staveOverrides: mergeStaveOptions(defaultClefStave, overrides?.clef?.staveOverrides),
  };

  const renderer: VexflowRendererConfig = {
    ...defaultRendererConfig,
    ...overrides?.renderer,
    width: overrides?.renderer?.width ?? defaultRendererConfig.width,
    height: staveHeight,
  };

  const metrics = mergeMetricOverrides(baseStaffConfig.metrics, overrides?.metrics);

  return {
    measureWidth,
    staveHeight,
    spacingBetweenLinesPx: spacing,
    staveStyle: mergedStaveStyle,
    clef,
    renderer,
    metrics,
  };
};

export const DEFAULT_VEXFLOW_STAFF_CONFIG = resolveStaffConfig();

function mergeMetricOverrides(
  base: VexflowMetricOverrides | undefined,
  override: VexflowMetricOverrides | undefined,
): VexflowMetricOverrides | undefined {
  if (!base && !override) return undefined;

  const mergedMetrics = {
    ...(base?.metrics ?? {}),
    ...(override?.metrics ?? {}),
  };

  const result: VexflowMetricOverrides = {
    stemWidth: override?.stemWidth ?? base?.stemWidth,
    stemHeight: override?.stemHeight ?? base?.stemHeight,
    metrics: Object.keys(mergedMetrics).length > 0 ? mergedMetrics : undefined,
  };

  if (result.stemWidth === undefined) delete result.stemWidth;
  if (result.stemHeight === undefined) delete result.stemHeight;
  if (!result.metrics) delete result.metrics;

  return Object.keys(result).length > 0 ? result : undefined;
}

interface MetricsMutation {
  key: string;
  previous: unknown;
  rootKey?: string;
}

export const applyVexflowMetrics = (overrides?: VexflowMetricOverrides) => {
  if (!overrides) return () => {};

  const applied: MetricsMutation[] = [];
  const roots = new Set<string | undefined>();

  if (overrides.stemWidth !== undefined) {
    applied.push({ key: 'STEM_WIDTH', previous: VexFlow.STEM_WIDTH });
    VexFlow.STEM_WIDTH = overrides.stemWidth;
  }

  if (overrides.stemHeight !== undefined) {
    applied.push({ key: 'STEM_HEIGHT', previous: VexFlow.STEM_HEIGHT });
    VexFlow.STEM_HEIGHT = overrides.stemHeight;
  }

  const metricsOverrides = overrides.metrics ?? {};
  Object.entries(metricsOverrides).forEach(([key, value]) => {
    const { previous, rootKey } = setMetricsDefaultValue(key, value);
    applied.push({ key, previous, rootKey });
    roots.add(rootKey);
  });

  roots.forEach((key) => {
    if (key) Metrics.clear(key);
    else Metrics.clear();
  });

  return () => {
    applied.reverse().forEach((mutation) => {
      if (mutation.key === 'STEM_WIDTH') {
        VexFlow.STEM_WIDTH = mutation.previous as number;
        return;
      }
      if (mutation.key === 'STEM_HEIGHT') {
        VexFlow.STEM_HEIGHT = mutation.previous as number;
        return;
      }
      restoreMetricsDefault(mutation.key, mutation.previous);
    });
    roots.forEach((key) => {
      if (key) Metrics.clear(key);
      else Metrics.clear();
    });
  };
};

const setMetricsDefaultValue = (key: string, value: unknown) => {
  const parts = key.split('.').filter(Boolean);
  const last = parts.pop();
  if (!last) {
    throw new Error(`Invalid metrics key "${key}"`);
  }

  let cursor: Record<string, unknown> = MetricsDefaults;
  parts.forEach((part) => {
    if (cursor[part] == null || typeof cursor[part] !== 'object') {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  });

  const previous = cursor[last];
  cursor[last] = value;
  return { previous, rootKey: parts[0] };
};

const restoreMetricsDefault = (key: string, value: unknown) => {
  const parts = key.split('.').filter(Boolean);
  const last = parts.pop();
  if (!last) return;

  let cursor: Record<string, unknown> = MetricsDefaults;
  parts.forEach((part) => {
    if (cursor[part] == null || typeof cursor[part] !== 'object') {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  });

  if (value === undefined) delete cursor[last];
  else cursor[last] = value;
};
