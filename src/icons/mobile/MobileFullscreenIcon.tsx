import React from 'react';
import type { IconProps } from '@typings/icons.types';

const MobileFullscreenIcon: React.FC<IconProps> = ({ width = '100%', height = '100%' }) => (
  <svg viewBox="0 0 36 36" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M 10 16 L 10 10.5 C 10 10.224 10.224 10 10.5 10 L 16 10 L 16 12 L 12 12 L 12 16 Z M 24 16 L 24 12 L 20 12 L 20 10 L 25.5 10 C 25.776 10 26 10.224 26 10.5 L 26 16 Z M 24 20 L 26 20 L 26 25.5 C 26 25.776 25.776 26 25.5 26 L 20 26 L 20 24 L 24 24 Z M 10 20 L 10 25.5 C 10 25.776 10.224 26 10.5 26 L 16 26 L 16 24 L 12 24 L 12 20 Z"
    />
  </svg>
);

MobileFullscreenIcon.displayName = 'MobileFullscreenIcon';

export default React.memo(MobileFullscreenIcon, (p, n) => p.width === n.width && p.height === n.height);
