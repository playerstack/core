export interface UseMobileAutoHideParams {
  shouldStayVisible: boolean;
  onHidingChange: (hiding: boolean) => void;
  hideDelay?: number;
}

export interface UseMobileAutoHideReturn {
  controlsVisible: boolean;
  toggleControls: () => void;
  showControls: () => void;
  hideControls: () => void;
}
