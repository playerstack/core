/**
 * Slider math utilities for time sliders and volume sliders.
 * Pure geometry calculations — no framework dependency.
 */

/**
 * Extract X coordinate from a mouse or touch event-like object.
 */
export function getEventXCoordinate(event: { clientX?: number; changedTouches?: { pageX: number }[] }): number {
  if (event.changedTouches && event.changedTouches.length >= 1) {
    return event.changedTouches[0]!.pageX;
  }
  return event.clientX || 0;
}

/**
 * Clamp an element's position within a slider's bounds.
 */
export function getClampedPosition({
  duration,
  currentTime,
  sliderWidth,
  elementWidth,
  offset = 0,
}: {
  duration: number;
  currentTime: number;
  sliderWidth: number;
  elementWidth: number;
  offset?: number;
}): number {
  if (duration <= 0 || sliderWidth <= 0 || elementWidth <= 0) {
    return 0;
  }
  const relativePosition = (currentTime / duration) * sliderWidth;
  const halfWidth = elementWidth / 2;
  const minPosition = halfWidth + offset;
  const maxPosition = sliderWidth - halfWidth - offset;
  return Math.min(maxPosition, Math.max(minPosition, relativePosition));
}

/**
 * Convert a pointer X position on a slider into a time value.
 */
export function getTimeFromSliderPosition(clientX: number, rect: { left: number; width: number }, duration: number): number {
  const w = clientX - rect.left;
  if (w <= 0) return 0;
  if (w >= rect.width) return duration;
  return Math.round((duration * w) / rect.width);
}

/**
 * Calculate CSS translateX percentages for slider track and handle.
 */
export function getTrackTranslateX({
  duration,
  currentTime,
  sliderWidth,
  handleWidth,
}: {
  duration: number;
  currentTime: number;
  sliderWidth: number;
  handleWidth: number;
}): { trackTranslateX: string; handleTranslateX: string } {
  if (duration === 0) {
    return { trackTranslateX: '-100', handleTranslateX: '-100' };
  }

  const clampedPosition = getClampedPosition({
    duration,
    currentTime,
    sliderWidth,
    elementWidth: handleWidth,
    offset: 0,
  });

  const trackTranslateX = ((100 * currentTime) / duration - 100).toFixed(1);
  const handleTranslateX = ((clampedPosition / sliderWidth) * 100 - 100).toFixed(1);

  return { trackTranslateX, handleTranslateX };
}

/**
 * Calculate tooltip translateX percentage clamped within slider bounds.
 */
export function getMouseTranslateX({
  duration,
  currentTime,
  sliderWidth,
  tooltipWidth,
}: {
  duration: number;
  currentTime: number;
  sliderWidth: number;
  tooltipWidth: number;
}): string {
  const clampedPosition = getClampedPosition({
    duration,
    currentTime,
    sliderWidth,
    elementWidth: tooltipWidth,
    offset: 5,
  });

  return ((clampedPosition / sliderWidth) * 100).toFixed(1);
}

/**
 * Calculate volume percentage from pointer X position on a slider.
 */
export function getVolumePercentage(offsetX: number, trackWidth: number): number {
  let percentage = (offsetX / trackWidth) * 100;
  if (percentage < 0) percentage = 0;
  if (percentage > 100) percentage = 100;
  return percentage;
}
