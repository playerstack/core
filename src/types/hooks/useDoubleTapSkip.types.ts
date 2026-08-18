export interface UseDoubleTapSkipParams {
  currentTime: number;
  duration: number;
  changeCurrentTime: (time: number) => void;
  showControls?: () => void;
  skipSeconds?: number;
  doubleTapDelay?: number;
  displayDuration?: number;
}

export interface SkipState {
  direction: 'forward' | 'backward' | null;
  visible: boolean;
  seconds: number;
}

export interface UseDoubleTapSkipReturn {
  skipState: SkipState;
  handleTapLeft: () => void;
  handleTapRight: () => void;
}
