import {
  Formatter,
  Stave,
  StaveNote,
  Voice,
  VoiceMode,
  type RenderContext,
  type StaveNoteStruct,
} from '$lib/vexflow/vexflow-core';
import type { StaffSong } from '$lib/staff/moving-staff-controller';
import type { MovingStaffPluginFactory } from './plugin-types';

const CORE_NOTE: StaveNoteStruct = { keys: ['b/4'], duration: '8' };
const FALLBACK_TRAILING_STAVES = 5;

const computeViewportWidth = (context: RenderContext | null, measureWidth: number): number => {
  if (typeof window !== 'undefined' && Number.isFinite(window.innerWidth) && window.innerWidth > 0) {
    return window.innerWidth;
  }

  const contextWidth = context?.width ?? 0;
  if (Number.isFinite(contextWidth) && contextWidth > 0) {
    return contextWidth;
  }

  return measureWidth * FALLBACK_TRAILING_STAVES;
};

const deriveTrailingStaveCount = (context: RenderContext | null, measureWidth: number): number => {
  if (!Number.isFinite(measureWidth) || measureWidth <= 0) {
    return FALLBACK_TRAILING_STAVES;
  }

  const viewportWidth = computeViewportWidth(context, measureWidth);
  return Math.max(1, Math.ceil(viewportWidth / measureWidth));
};

export const createTrailingStavesPlugin: MovingStaffPluginFactory<{}, {}> = ({
  controller,
  layout,
  config,
}) => {
  let alreadyDrawn = false;

  const drawTrailingStaves = (song: StaffSong) => {
    if (alreadyDrawn) return;
    if (!song.measures?.length) return;
    if (!controller.context) return;

    const trailingStaveCount = deriveTrailingStaveCount(controller.context, layout.measureWidth);

    for (let index = 0; index < trailingStaveCount; index++) {
      // traling notes have only right bar
      const trailingStave = new Stave(config, controller.staveX, 0, layout.measureWidth);
      trailingStave.setContext(controller.context).draw();

      if (index === 0) {
        const trailingNote = new StaveNote(config, { ...CORE_NOTE });
        // push this trailingNote into 'notes' array so that the cursor could move pass the actual last note
        controller.notes.push(trailingNote);
        // use the spacing system but not draw the note
        const voice = new Voice(config, song.timeSignature)
          .setMode(VoiceMode.SOFT)
          .addTickables([trailingNote]);
        new Formatter(config).formatToStave([voice], trailingStave);
      }

      controller.staveX += layout.measureWidth;
      controller.renderer.resize(controller.staveX, controller.context.height);
    }

    alreadyDrawn = true;
  };

  return {
    id: 'trailing-staves',
    onSongRendered: ({ song }) => drawTrailingStaves(song),
    destroy: () => {
      alreadyDrawn = false;
    },
  };
};
