/**
 * Browser and environment detection constants.
 */
export const HAS_NAVIGATOR = typeof navigator !== 'undefined';
export const IS_IPAD_PRO = HAS_NAVIGATOR && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
export const IS_IOS =
  HAS_NAVIGATOR && (/iPad|iPhone|iPod/.test(navigator.userAgent) || IS_IPAD_PRO) && !(window as any)['MSStream'];
export const IS_SAFARI =
  HAS_NAVIGATOR && /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && !(window as any)['MSStream'];

/**
 * External SDK CDN URLs.
 * VERSION placeholder is replaced at runtime with the configured version.
 */
export const HLS_SDK_URL = 'https://cdn.jsdelivr.net/npm/hls.js@VERSION/dist/hls.min.js';
export const HLS_GLOBAL = 'Hls';

export const DASH_SDK_URL = 'https://cdnjs.cloudflare.com/ajax/libs/dashjs/VERSION/dash.all.min.js';
export const DASH_GLOBAL = 'dashjs';

export const FLV_SDK_URL = 'https://cdn.jsdelivr.net/npm/flv.js@VERSION/dist/flv.min.js';
export const FLV_GLOBAL = 'flvjs';

/**
 * Default SDK versions.
 */
export const DEFAULT_HLS_VERSION = '1.5.7';
export const DEFAULT_DASH_VERSION = '4.7.4';
export const DEFAULT_FLV_VERSION = '1.6.2';
