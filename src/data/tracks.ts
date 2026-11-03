export interface Track { title: string; subtitle: string; bpm: number; notes: number[] }

// Small original generative compositions: no streaming account or remote audio required.
export const tracks: Track[] = [
  { title:'Window seat', subtitle:'Soft keys · a slow afternoon', bpm:68, notes:[48,55,60,64,47,54,59,62,45,52,57,60,43,50,55,59] },
  { title:'After hours', subtitle:'Warm tones · lights down low', bpm:58, notes:[45,52,59,60,41,48,55,57,48,55,62,64,43,50,57,59] },
  { title:'Sunday, slowly', subtitle:'Gentle bells · nowhere to be', bpm:76, notes:[53,60,65,69,48,55,60,64,50,57,62,65,46,53,58,62] },
];
