import React from 'react';
import type { IconProps } from '@typings/icons.types';

const MutedIcon: React.FC<IconProps> = ({ width = 36, height = 36 }) => (
  <svg viewBox="0 0 36 36" width={width} height={height} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M 22.5 18 C 22.5 16.235 21.48 14.71 20 13.975 L 20 16.185 L 22.455 18.64 C 22.485 18.43 22.5 18.215 22.5 18 Z" />
    <path d="M 25 18 C 25 18.94 24.795 19.825 24.46 20.64 L 25.975 22.155 C 26.625 20.91 27 19.5 27 18 C 27 13.72 24.005 10.14 20 9.23 L 20 11.295 C 22.89 12.155 25 14.83 25 18 Z" />
    <polygon points="18 10 15.91 12.09 18 14.18" />
    <path d="M 10.275 9 L 9 10.275 L 13.725 15 L 9 15 L 9 21 L 13 21 L 18 26 L 18 19.275 L 22.255 23.53 C 21.585 24.045 20.83 24.46 20 24.71 L 20 26.775 C 21.375 26.46 22.63 25.83 23.685 24.965 L 25.725 27 L 27 25.725 L 18 16.725 L 10.275 9 Z" />
  </svg>
);

MutedIcon.displayName = 'MutedIcon';

export default React.memo(MutedIcon, (p, n) => p.width === n.width && p.height === n.height);
