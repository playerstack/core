import React from 'react';
import type { IconProps } from '../types';

const MobilePauseIcon: React.FC<IconProps> = ({ width = '100%', height = '100%' }) => (
  <svg viewBox="0 0 56 56" preserveAspectRatio="xMidYMid meet" width={width} height={height} fill="none">
    <rect fill="currentColor" x="12" y="12" width="8" height="32" />
    <rect fill="currentColor" x="36" y="12" width="8" height="32" />
  </svg>
);

MobilePauseIcon.displayName = 'MobilePauseIcon';

export default React.memo(MobilePauseIcon, (p, n) => p.width === n.width && p.height === n.height);
