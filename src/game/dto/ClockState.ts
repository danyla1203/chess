export type ClockState = {
  w: number;
  b: number;
  running: 'w' | 'b' | null;
  serverNow: number;
};
