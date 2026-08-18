import React from 'react';
import type { IconProps } from '@typings/icons.types';

const MobileCloseIcon: React.FC<IconProps> = ({ width = 24, height = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

MobileCloseIcon.displayName = 'MobileCloseIcon';

export default React.memo(MobileCloseIcon, (p, n) => p.width === n.width && p.height === n.height);
