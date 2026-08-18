export interface UseAutoHideParams {
  shouldStayVisible: boolean;
  onHidingChange: (hiding: boolean) => void;
  hideDelay?: number;
}

export interface UseAutoHideReturn {
  showControls: () => void;
  hideControls: () => void;
}
