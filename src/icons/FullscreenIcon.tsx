import React from 'react';
import type { IconProps } from '../types/icons.types';

const FullscreenIcon: React.FC<IconProps> = ({ width = 36, height = 36 }) => (
  <svg viewBox="0 0 36 36" width={width} height={height} fill="currentColor">
    <path d="M 12 20.667 L 10 20.667 L 10 26 L 15.333 26 L 15.333 24 L 12 24 L 12 20.667 Z M 10 15.333 L 12 15.333 L 12 12 L 15.333 12 L 15.333 10 L 10 10 L 10 15.333 Z M 24 24 L 20.667 24 L 20.667 26 L 26 26 L 26 20.667 L 24 20.667 L 24 24 Z M 20.667 10 L 20.667 12 L 24 12 L 24 15.333 L 26 15.333 L 26 10 L 20.667 10 Z" />
  </svg>
);

FullscreenIcon.displayName = 'FullscreenIcon';

export default React.memo(FullscreenIcon, (p, n) => p.width === n.width && p.height === n.height);
