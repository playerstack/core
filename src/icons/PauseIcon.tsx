import React from 'react';
import type { IconProps } from '@typings/icons.types';

const PauseIcon: React.FC<IconProps> = ({ width = 36, height = 36 }) => (
  <svg viewBox="0 0 36 36" width={width} height={height} fill="currentColor">
    <rect x="12" y="10" width="3" height="16" />
    <rect x="21" y="10" width="3" height="16" />
  </svg>
);

PauseIcon.displayName = 'PauseIcon';

export default React.memo(PauseIcon, (p, n) => p.width === n.width && p.height === n.height);
