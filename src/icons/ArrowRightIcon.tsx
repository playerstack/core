import React from 'react';
import type { IconProps } from '../types/icons.types';

const ArrowRightIcon: React.FC<IconProps> = ({ width = 36, height = 36 }) => (
  <svg viewBox="0 0 24 24" width={width} height={height} fill="currentColor">
    <path d="M 15.7 12 C 15.7 12.105 15.658 12.196 15.573 12.277 L 9.648 17.88 C 9.563 17.96 9.466 18 9.355 18 C 9.245 18 9.148 17.96 9.063 17.88 L 8.427 17.278 C 8.342 17.199 8.3 17.106 8.3 17.002 C 8.3 16.898 8.342 16.806 8.427 16.725 L 13.424 12 L 8.427 7.275 C 8.342 7.194 8.3 7.102 8.3 6.998 C 8.3 6.894 8.342 6.801 8.427 6.722 L 9.063 6.12 C 9.148 6.04 9.245 6 9.355 6 C 9.466 6 9.563 6.04 9.648 6.12 L 15.573 11.723 C 15.658 11.804 15.7 11.895 15.7 12 Z" />
  </svg>
);

ArrowRightIcon.displayName = 'ArrowRightIcon';

export default React.memo(ArrowRightIcon, (p, n) => p.width === n.width && p.height === n.height);
