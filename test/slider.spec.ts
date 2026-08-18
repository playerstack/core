import {
  getEventXCoordinate,
  getClampedPosition,
  getTimeFromSliderPosition,
  getTrackTranslateX,
  getMouseTranslateX,
  getVolumePercentage,
} from '@slider';

describe('getEventXCoordinate', () => {
  test('returns clientX from mouse event', () => {
    expect(getEventXCoordinate({ clientX: 150 })).toBe(150);
  });

  test('returns pageX from touch event', () => {
    expect(getEventXCoordinate({ changedTouches: [{ pageX: 200 }] })).toBe(200);
  });

  test('returns 0 when no coordinates', () => {
    expect(getEventXCoordinate({})).toBe(0);
  });

  test('prefers touch over clientX', () => {
    expect(getEventXCoordinate({ clientX: 100, changedTouches: [{ pageX: 200 }] })).toBe(200);
  });

  test('returns clientX when changedTouches is empty', () => {
    expect(getEventXCoordinate({ clientX: 100, changedTouches: [] })).toBe(100);
  });
});

describe('getClampedPosition', () => {
  test('returns 0 when duration is 0', () => {
    expect(getClampedPosition({ duration: 0, currentTime: 0, sliderWidth: 100, elementWidth: 20 })).toBe(0);
  });

  test('returns 0 when sliderWidth is 0', () => {
    expect(getClampedPosition({ duration: 100, currentTime: 50, sliderWidth: 0, elementWidth: 20 })).toBe(0);
  });

  test('returns 0 when elementWidth is 0', () => {
    expect(getClampedPosition({ duration: 100, currentTime: 50, sliderWidth: 200, elementWidth: 0 })).toBe(0);
  });

  test('clamps to min position at start', () => {
    const result = getClampedPosition({ duration: 100, currentTime: 0, sliderWidth: 200, elementWidth: 40 });
    expect(result).toBe(20); // halfWidth = 20
  });

  test('clamps to max position at end', () => {
    const result = getClampedPosition({ duration: 100, currentTime: 100, sliderWidth: 200, elementWidth: 40 });
    expect(result).toBe(180); // sliderWidth - halfWidth = 180
  });

  test('returns relative position in middle', () => {
    const result = getClampedPosition({ duration: 100, currentTime: 50, sliderWidth: 200, elementWidth: 40 });
    expect(result).toBe(100); // (50/100)*200 = 100
  });

  test('respects offset parameter', () => {
    const result = getClampedPosition({ duration: 100, currentTime: 0, sliderWidth: 200, elementWidth: 40, offset: 10 });
    expect(result).toBe(30); // halfWidth + offset = 30
  });
});

describe('getTimeFromSliderPosition', () => {
  test('returns 0 when clientX is at left edge', () => {
    expect(getTimeFromSliderPosition(100, { left: 100, width: 200 }, 60)).toBe(0);
  });

  test('returns 0 when clientX is before left', () => {
    expect(getTimeFromSliderPosition(50, { left: 100, width: 200 }, 60)).toBe(0);
  });

  test('returns duration when clientX is at right edge', () => {
    expect(getTimeFromSliderPosition(300, { left: 100, width: 200 }, 60)).toBe(60);
  });

  test('returns duration when clientX is beyond right', () => {
    expect(getTimeFromSliderPosition(400, { left: 100, width: 200 }, 60)).toBe(60);
  });

  test('returns proportional time for middle position', () => {
    expect(getTimeFromSliderPosition(200, { left: 100, width: 200 }, 60)).toBe(30);
  });
});

describe('getTrackTranslateX', () => {
  test('returns -100 for both when duration is 0', () => {
    const result = getTrackTranslateX({ duration: 0, currentTime: 0, sliderWidth: 200, handleWidth: 20 });
    expect(result.trackTranslateX).toBe('-100');
    expect(result.handleTranslateX).toBe('-100');
  });

  test('returns correct values at midpoint', () => {
    const result = getTrackTranslateX({ duration: 100, currentTime: 50, sliderWidth: 200, handleWidth: 20 });
    expect(result.trackTranslateX).toBe('-50.0');
  });

  test('returns 0.0 track at end', () => {
    const result = getTrackTranslateX({ duration: 100, currentTime: 100, sliderWidth: 200, handleWidth: 20 });
    expect(result.trackTranslateX).toBe('0.0');
  });
});

describe('getMouseTranslateX', () => {
  test('returns clamped percentage string', () => {
    const result = getMouseTranslateX({ duration: 100, currentTime: 50, sliderWidth: 200, tooltipWidth: 40 });
    expect(parseFloat(result)).toBeCloseTo(50, 0);
  });
});

describe('getVolumePercentage', () => {
  test('returns 0 for negative offset', () => {
    expect(getVolumePercentage(-10, 100)).toBe(0);
  });

  test('returns 100 for offset beyond width', () => {
    expect(getVolumePercentage(150, 100)).toBe(100);
  });

  test('returns proportional percentage', () => {
    expect(getVolumePercentage(50, 100)).toBe(50);
  });

  test('returns 0 for 0 offset', () => {
    expect(getVolumePercentage(0, 100)).toBe(0);
  });
});
