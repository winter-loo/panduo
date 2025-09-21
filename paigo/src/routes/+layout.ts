import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
  const song_data = {
    title: 'Different Colors',
    artist: 'Walk the Moon',
    measures: [
      {
        notes: [
          { keys: ['f/4'], duration: '4', fingering: 2 },
          { keys: ['f/4'], duration: '4', fingering: 2 },
          // { keys: ['f/4'], duration: '8', fingering: 4 },
          // { keys: ['c/4'], duration: '8', fingering: 1 },
          { keys: ['b/4'], duration: '2', fingering: null },
        ],
      },
      {
        notes: [{ keys: ['b/4'], duration: '1', fingering: 5 }],
      },
    ],
  };

  return {
    song: song_data,
  };
};
