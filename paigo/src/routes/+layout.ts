import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
  let song_data = {
    title: 'Different Colors',
    artist: 'Walk the Moon',
    timeSignature: '4/4',
    keySignature: 'D',
    tempo: 60,
    measures: [
      {
        notes: [
          { keys: ['b/4'], duration: '4' },
          { keys: ['b/4'], duration: '4' },
          { keys: ['b/4'], duration: '4' },
          { keys: ['b/4'], duration: '4' },
        ]
      },
      {
        notes: [
          { keys: ['a/4'], duration: '4', fingering: 2 },
          { keys: ['a/4'], duration: '4', fingering: 2 },
          { keys: ['a/4'], duration: '4', fingering: 2 },
          { keys: ['a/4'], duration: '4', fingering: 2 },
        ],
      },
      {
        notes: [
          { keys: ['a/4'], duration: '2', fingering: 2 },
          { keys: ['e/5'], duration: '4', fingering: 5 },
          { keys: ['e/5'], duration: '4', fingering: 5 },
        ],
      },
      // {
      //   notes: [
      //     { keys: ['f/4'], duration: '2d', fingering: 2 },
      //     { keys: ['b/4'], duration: '8', fingering: 5 },
      //     { keys: ['a/4'], duration: '8', fingering: 5 },
      //   ],
      // },
      // {
      //   notes: [
      //     { keys: ['e/4'], duration: '8', fingering: 2 },
      //     { keys: ['f/4'], duration: '8', fingering: 5 },
      //     { keys: ['e/4'], duration: '8', fingering: 5 },
      //     { keys: ['d/4'], duration: '8', fingering: 5 },
      //     { keys: ['d/4'], duration: '2', fingering: 5 },
      //   ],
      // }
    ],
  };

  return {
    song: song_data,
  };
};
