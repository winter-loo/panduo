import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
  let song_data = {
    title: 'Different Colors',
    artist: 'Walk the Moon',
    timeSignature: '4/4',
    keySignature: 'A',
    tempo: 60,
    measures: [
      {
        notes: [
          { keys: ['b/4'], duration: '4' },
          { keys: ['r/4'], duration: '4r' },
          { keys: ['r/4'], duration: '4r' },
          { keys: ['r/4'], duration: '4r' },
        ]
      },
      {
        notes: [
          { keys: ['r/4'], duration: '4r', fingering: 2 },
          { keys: ['c/4'], duration: '4', fingering: 2 },
          { keys: ['d/4'], duration: '4', fingering: 2 },
          { keys: ['e/4'], duration: '4', fingering: 2 },
          // { keys: ['e/4'], duration: '8', fingering: 2 },
          // { keys: ['e/4'], duration: '8', fingering: 2 },
          // { keys: ['f/4'], duration: '8', fingering: 2 },
          // { keys: ['g/4'], duration: '8', fingering: 2 },
          // { keys: ['e/5'], duration: '8', fingering: 2 },
          // { keys: ['a/4'], duration: '8', fingering: 2 },
          // { keys: ['b/4'], duration: '8', fingering: 2 },
          // { keys: ['e/5'], duration: '4', fingering: 4 },
          // { keys: ['c/4'], duration: '8', fingering: 1 },
          // { keys: ['b/4'], duration: '2', fingering: null },
        ],
      },
      {
        notes: [
          { keys: ['f/4'], duration: '2d', fingering: 2 },
          { keys: ['e/4'], duration: '4', fingering: 5 },
        ],
      },
      {
        notes: [
          { keys: ['f/4'], duration: '2d', fingering: 2 },
          { keys: ['b/4'], duration: '8', fingering: 5 },
          { keys: ['a/4'], duration: '8', fingering: 5 },
        ],
      },
      {
        notes: [
          { keys: ['e/4'], duration: '8', fingering: 2 },
          { keys: ['f/4'], duration: '8', fingering: 5 },
          { keys: ['e/4'], duration: '8', fingering: 5 },
          { keys: ['d/4'], duration: '8', fingering: 5 },
          { keys: ['d/4'], duration: '2', fingering: 5 },
        ],
      }
    ],
  };

  return {
    song: song_data,
  };
};
