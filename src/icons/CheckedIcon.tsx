import React from 'react';
import type { IconProps } from '@typings/icons.types';

const CheckedIcon: React.FC<IconProps> = ({ width = 36, height = 36 }) => (
  <svg viewBox="0 0 36 36" width={width} height={height} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.8 19.582 13.237 28.05 31.2 9.877 29.295 7.95 13.237 24.197 6.705 17.586Z" />
  </svg>
);

CheckedIcon.displayName = 'CheckedIcon';

export default React.memo(CheckedIcon, (p, n) => p.width === n.width && p.height === n.height);
