import React from 'react';
import type { IconProps } from '../types/icons.types';

const AudioReplayIcon: React.FC<IconProps> = ({ width = 36, height = 36 }) => (
  <svg viewBox="0 0 36 36" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 9V5.25L12.75 10.5L18 15.75V12C21.73 12 24.75 15.02 24.75 18.75C24.75 22.48 21.73 25.5 18 25.5C14.27 25.5 11.25 22.48 11.25 18.75H8.75C8.75 23.86 12.89 28 18 28C23.11 28 27.25 23.86 27.25 18.75C27.25 13.64 23.11 9.5 18 9.5V9Z"
      fill="currentColor"
    />
  </svg>
);

AudioReplayIcon.displayName = 'AudioReplayIcon';

export default React.memo(AudioReplayIcon, (p, n) => p.width === n.width && p.height === n.height);
