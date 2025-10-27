
export enum Phase {
  Inhale = 'inhale',
  HoldIn = 'holdIn',
  Exhale = 'exhale',
  HoldOut = 'holdOut',
  Idle = 'idle',
}

export interface Stats {
  sessions: number;
  totalCycles: number;
}
