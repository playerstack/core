import React from 'react';
import type { IconProps } from '../types';

const MobileBackIcon: React.FC<IconProps> = ({ width = 24, height = 24 }) => (
  <svg viewBox="0 0 24 24" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M 15.7 6.998 C 15.7 7.102 15.658 7.194 15.573 7.275 L 10.576 12 L 15.573 16.725 C 15.658 16.806 15.7 16.898 15.7 17.002 C 15.7 17.106 15.658 17.198 15.573 17.279 L 14.937 17.88 C 14.852 17.96 14.755 18 14.645 18 C 14.534 18 14.437 17.96 14.352 17.88 L 8.427 12.277 C 8.342 12.196 8.3 12.104 8.3 12 C 8.3 11.896 8.342 11.804 8.427 11.723 L 14.352 6.12 C 14.437 6.04 14.534 6 14.645 6 C 14.755 6 14.852 6.04 14.937 6.12 L 15.573 6.721 C 15.658 6.802 15.7 6.894 15.7 6.998 Z"
    />
  </svg>
);

MobileBackIcon.displayName = 'MobileBackIcon';

export default React.memo(MobileBackIcon, (p, n) => p.width === n.width && p.height === n.height);
