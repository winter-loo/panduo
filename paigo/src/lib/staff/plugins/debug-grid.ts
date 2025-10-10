import {
  DebugGrid,
  type DebugGridOptions,
  type RenderContext,
} from '$lib/vexflow/vexflow-core';
import type { StaffLayout } from '../moving-staff-controller';
import type {
  MovingStaffPluginFactory,
  MovingStaffPluginInitArgs,
  MovingStaffPluginInstance,
} from './plugin-types';

export interface DebugGridPluginState {
  enabled: boolean;
  options: DebugGridOptions;
  baseOptions: DebugGridOptions;
}

export interface DebugGridPluginConfig {
  enabled?: boolean;
  options?: DebugGridOptions;
}

export interface DebugGridPlugin
  extends MovingStaffPluginInstance<DebugGridPluginState>,
    DebugGridPluginControls {
  readonly id: 'debug-grid';
  readonly enabled: boolean;
  getBaseOptions(): DebugGridOptions;
  getOptions(): DebugGridOptions;
}

export interface DebugGridPluginControls {
  setEnabled(next: boolean): void;
  setOptions(next: DebugGridOptions): void;
  handleToggle(detail: { enabled: boolean }): void;
  handleOptionsChange(detail: { options: DebugGridOptions }): void;
  draw(): void;
  clear(): void;
}

type DebugGridFactory = MovingStaffPluginFactory<DebugGridPluginState, DebugGridPluginConfig>;

const serializeOptions = (options: DebugGridOptions): DebugGridOptions => ({
  ...options,
});

const computeBaseOptions = (layout: StaffLayout): DebugGridOptions => {
  const spacing = layout.spacingBetweenLinesPx;
  const majorSpacing = spacing * 4;
  return {
    spacing,
    majorSpacing,
    includeOriginLabels: true,
    showLabels: true,
  };
};

const normalizeOptions = (
  base: DebugGridOptions,
  overrides?: DebugGridOptions,
): DebugGridOptions => {
  const merged = {
    ...base,
    ...(overrides ?? {}),
  };
  if (merged.spacing === undefined || merged.spacing <= 0) {
    merged.spacing = base.spacing ?? 20;
  }
  if (merged.majorSpacing === undefined || merged.majorSpacing < merged.spacing) {
    merged.majorSpacing = Math.max(merged.spacing ?? base.spacing ?? 20, base.majorSpacing ?? 80);
  }
  return merged;
};

const cloneOptions = (options: DebugGridOptions): DebugGridOptions => ({
  ...options,
});

const syncSpacingFromBase = (
  options: DebugGridOptions,
  previousBase: DebugGridOptions,
  nextBase: DebugGridOptions,
) => {
  (['spacing', 'majorSpacing'] as const).forEach((key) => {
    const saved = options[key];
    const prevValue = previousBase[key];
    if (saved === undefined || saved === prevValue) {
      options[key] = nextBase[key];
    }
  });
};

const createDebugGridPluginInternal = (
  args: MovingStaffPluginInitArgs<DebugGridPluginState, DebugGridPluginConfig>,
): DebugGridPlugin => {
  const { controller, layout, context: initialContext, state, options: configOptions } = args;

  const resolveContext = (): RenderContext | null =>
    controller.getContext() ?? initialContext ?? null;

  let baseOptions = computeBaseOptions(layout);
  let optionsSeed: DebugGridOptions;

  if (state?.options) {
    optionsSeed = { ...state.options };
    if (state.baseOptions) {
      syncSpacingFromBase(optionsSeed, state.baseOptions, baseOptions);
    }
  } else if (configOptions?.options) {
    optionsSeed = { ...configOptions.options };
  } else {
    optionsSeed = { ...baseOptions };
  }

  let options = normalizeOptions(baseOptions, optionsSeed);
  let enabled = state?.enabled ?? configOptions?.enabled ?? false;

  let grid: DebugGrid | null = null;

  const clear = () => {
    grid?.clear();
    grid = null;
  };

  const drawInternal = () => {
    const ctx = resolveContext();
    if (!ctx) return;
    clear();
    grid = new DebugGrid(ctx, {
      ...baseOptions,
      ...options,
    });
    grid.draw();
  };

  const setEnabled = (next: boolean) => {
    if (next === enabled) return;
    enabled = next;
    if (enabled) {
      drawInternal();
    } else {
      clear();
    }
  };

  const setOptions = (next: DebugGridOptions) => {
    options = normalizeOptions(baseOptions, next);
    if (enabled) {
      drawInternal();
    }
  };

  const handleToggle = ({ enabled: next }: { enabled: boolean }) => {
    setEnabled(next);
  };

  const handleOptionsChange = ({ options: next }: { options: DebugGridOptions }) => {
    setOptions(next);
  };

  const updateLayout = (nextLayout: StaffLayout) => {
    const previousBase = baseOptions;
    baseOptions = computeBaseOptions(nextLayout);

    const updatedOptions = { ...options };
    syncSpacingFromBase(updatedOptions, previousBase, baseOptions);
    options = normalizeOptions(baseOptions, updatedOptions);

    if (enabled) {
      drawInternal();
    }
  };

  return {
    id: 'debug-grid',
    get enabled() {
      return enabled;
    },
    getBaseOptions: () => cloneOptions(baseOptions),
    getOptions: () => cloneOptions(options),
    setEnabled,
    setOptions,
    handleToggle,
    handleOptionsChange,
    draw: () => {
      if (!enabled) return;
      drawInternal();
    },
    clear,
    updateLayout,
    onReady: () => {
      if (enabled) {
        drawInternal();
      }
    },
    destroy: () => {
      clear();
    },
    serialize: () => ({
      enabled,
      options: serializeOptions(options),
      baseOptions: serializeOptions(baseOptions),
    }),
  };
};

export const createDebugGridPlugin: DebugGridFactory = (args) =>
  createDebugGridPluginInternal(args);
