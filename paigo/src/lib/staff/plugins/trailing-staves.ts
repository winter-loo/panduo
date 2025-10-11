import {
  Formatter,
  Stave,
  StaveNote,
  Voice,
  VoiceMode,
  type StaveNoteStruct,
} from '$lib/vexflow/vexflow-core';
import type { StaffSong } from '$lib/staff/moving-staff-controller';
import type { MovingStaffPluginFactory } from './plugin-types';

const CORE_NOTE: StaveNoteStruct = { keys: ['b/4'], duration: '8' };
const EXTRA_STAVES = 5;

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

    const rightBar = config.get('Stave.rightBar');
    for (let index = 0; index < EXTRA_STAVES; index++) {
      // traling notes have only right bar
      const trailingStave = new Stave(config, controller.staveX, 0, layout.measureWidth, { leftBar: false, rightBar });
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
