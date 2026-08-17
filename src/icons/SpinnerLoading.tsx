import React from 'react';

/**
 * CSS-based loading spinner overlay.
 * Not an SVG icon — renders a spinning circle with inline styles.
 */
const SpinnerLoading: React.FC = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      top: 0,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 1,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderWidth: 3,
          borderTopColor: 'rgba(255, 255, 255, 0.15)',
          borderBottomColor: 'rgba(255, 255, 255, 0.15)',
          borderRightColor: 'rgba(255, 255, 255, 0.15)',
          borderLeftColor: '#fff',
          borderStyle: 'solid',
          borderRadius: '50%',
          animation: 'playerstack-spinner 0.5s linear infinite',
        }}
      />
    </div>
  </div>
);

SpinnerLoading.displayName = 'SpinnerLoading';

export default React.memo(SpinnerLoading);
