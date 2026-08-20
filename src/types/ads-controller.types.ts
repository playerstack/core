/**
 * Snapshot of the current ad state.
 */
export interface AdsState {
  isAdActive: boolean;
  hasSkipTimer: boolean;
  canSkip: boolean;
  skipCountdown: number;
  adProgress: number;
}

/**
 * Typed event map for AdsController.
 */
export interface AdsControllerEvents {
  adActivated: () => void;
  adSkippable: () => void;
  adCompleted: () => void;
  adProgress: (data: { progress: number; canSkip: boolean; skipCountdown: number }) => void;
  stateChange: (state: AdsState) => void;
}

export type { AdsConfig } from '@typings/adapters.types';
