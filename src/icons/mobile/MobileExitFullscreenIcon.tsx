import React from 'react';
import type { IconProps } from '../types';

const MobileExitFullscreenIcon: React.FC<IconProps> = ({ width = '100%', height = '100%' }) => (
  <svg viewBox="0 0 36 36" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M 10 22.667 L 13.333 22.667 L 13.333 26 L 15.333 26 L 15.333 20.667 L 10 20.667 L 10 22.667 Z M 13.333 13.333 L 10 13.333 L 10 15.333 L 15.333 15.333 L 15.333 10 L 13.333 10 L 13.333 13.333 Z M 20.667 26 L 22.667 26 L 22.667 22.667 L 26 22.667 L 26 20.667 L 20.667 20.667 L 20.667 26 Z M 22.667 13.333 L 22.667 10 L 20.667 10 L 20.667 15.333 L 26 15.333 L 26 13.333 L 22.667 13.333 Z"
    />
  </svg>
);

MobileExitFullscreenIcon.displayName = 'MobileExitFullscreenIcon';

export default React.memo(MobileExitFullscreenIcon, (p, n) => p.width === n.width && p.height === n.height);
