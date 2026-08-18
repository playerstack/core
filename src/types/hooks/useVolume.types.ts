import type { VolumeAdapter } from '../adapters.types';

export interface UseVolumeParams {
  adapter: VolumeAdapter;
  muted: boolean;
  updateState: (state: { volume: number; muted: boolean }) => void;
}

export interface UseVolumeReturn {
  onMutedClick: () => void;
  changeVolume: (v: number) => void;
  updateVolumeWithCallback: (cb: (lastVolume: number) => number) => void;
}
