import React from 'react';
import type { IconProps } from '@typings/icons.types';

const MobileSkipChevronIcon: React.FC<IconProps> = ({ width = 20, height = 20 }) => (
  <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" width={width} height={height}>
    <path fill="#ccc" d="M8 5v14l11-7z" />
  </svg>
);

MobileSkipChevronIcon.displayName = 'MobileSkipChevronIcon';

export default React.memo(MobileSkipChevronIcon, (p, n) => p.width === n.width && p.height === n.height);
