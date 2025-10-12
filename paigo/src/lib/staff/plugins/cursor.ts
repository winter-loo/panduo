import {
  SVGContext,
  type RenderContext,
  type StaveNote,
} from '$lib/vexflow/vexflow-core';
import type { MovingStaffPluginFactory } from './plugin-types';

export interface CursorPluginOptions {
  fill?: string;
  opacity?: number;
}

interface CursorPluginState {
  anchorX: number | null;
}

const DEFAULT_FILL = '#e0e0e0';
const DEFAULT_OPACITY = 0.8;

export const createCursorPlugin: MovingStaffPluginFactory<CursorPluginState, CursorPluginOptions> = ({
  controller,
  config,
  context,
  state,
  options,
}) => {
  let cursorAnchorX: number | null = state?.anchorX ?? null;
  let cursorElement: SVGGElement | null = null;

  const resolveSvgContext = (): SVGContext | null => {
    const ctx: RenderContext | null = controller.getContext();
    if (ctx instanceof SVGContext) return ctx;
    if (context instanceof SVGContext) return context;
    return null;
  };

  const ensureCursorElement = (): SVGGElement | null => {
    if (cursorElement) return cursorElement;
    const svg = resolveSvgContext();
    if (!svg) return null;
    const width = config.get('Stem.width');
    const height = svg.height;
    cursorElement = svg.openGroup('cursor');
    svg.fillRect(0, 0, width, height, {
      rx: width / 2,
      ry: width / 2,
      opacity: options?.opacity ?? DEFAULT_OPACITY,
      fill: options?.fill ?? DEFAULT_FILL,
      'pointer-events': 'none',
    });
    svg.closeGroup();
    return cursorElement;
  };

  const syncCursorPosition = (offsetX: number = controller.currentOffsetX) => {
    if (cursorAnchorX === null) return;
    const element = ensureCursorElement();
    if (!element) return;
    element.setAttribute('transform', `translate(${cursorAnchorX + offsetX}, 0)`);
  };

  const findAnchor = (): number | null => {
    const firstNote: StaveNote | undefined = controller.notes?.[0];
    return firstNote?.getAbsoluteX() ?? null;
  };

  const refreshAnchor = () => {
    cursorAnchorX = findAnchor();
    syncCursorPosition();
  };

  const disposeCursor = () => {
    cursorElement?.remove();
    cursorElement = null;
  };

  const unsubscribeMove = controller.addMoveListener(syncCursorPosition);
  const unsubscribeReset = controller.addResetListener(refreshAnchor);

  return {
    id: 'cursor',
    onReady: refreshAnchor,
    onSongRendered: refreshAnchor,
    updateLayout: () => {
      disposeCursor();
      refreshAnchor();
    },
    destroy: () => {
      unsubscribeMove();
      unsubscribeReset();
      disposeCursor();
      cursorAnchorX = null;
    },
    serialize: () => ({
      anchorX: cursorAnchorX,
    }),
  };
};
