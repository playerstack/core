import React from 'react';
import type { IconProps } from '@typings/icons.types';

const AudioPauseIcon: React.FC<IconProps> = ({ width = 36, height = 36 }) => (
  <svg viewBox="0 0 36 36" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11 9.5C11 9.08 11.34 8.75 11.75 8.75H14.75C15.16 8.75 15.5 9.08 15.5 9.5V26.5C15.5 26.92 15.16 27.25 14.75 27.25H11.75C11.34 27.25 11 26.92 11 26.5V9.5Z"
      fill="currentColor"
    />
    <path
      d="M20.5 9.5C20.5 9.08 20.84 8.75 21.25 8.75H24.25C24.66 8.75 25 9.08 25 9.5V26.5C25 26.92 24.66 27.25 24.25 27.25H21.25C20.84 27.25 20.5 26.92 20.5 26.5V9.5Z"
      fill="currentColor"
    />
  </svg>
);

AudioPauseIcon.displayName = 'AudioPauseIcon';

export default React.memo(AudioPauseIcon, (p, n) => p.width === n.width && p.height === n.height);
