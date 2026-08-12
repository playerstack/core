// Core
export { MediaEngine } from './media-engine';
export { EventEmitter } from './event-emitter';

// Patterns
export { canPlay, isAudioUrl, VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, HLS_EXTENSIONS, DASH_EXTENSIONS, FLV_EXTENSIONS } from './patterns';

// Constants
export {
  HAS_NAVIGATOR,
  IS_IPAD_PRO,
  IS_IOS,
  IS_SAFARI,
  HLS_SDK_URL,
  HLS_GLOBAL,
  DASH_SDK_URL,
  DASH_GLOBAL,
  FLV_SDK_URL,
  FLV_GLOBAL,
  DEFAULT_HLS_VERSION,
  DEFAULT_DASH_VERSION,
  DEFAULT_FLV_VERSION,
} from './constants';

// Utils (re-export for convenience)
export {
  isMediaStream,
  isBlobUrl,
  hasAudio,
  supportsWebKitPresentationMode,
  getCookie,
  setCookie,
  deleteCookie,
  isDesktop,
  isMobile,
  formatTime,
  indexBy,
  omit,
  getGlobal,
  getSDK,
  parseVTTCaptions,
  getActiveCues,
  hexToRgba,
  getEdgeStyleCSS,
  DEFAULT_CAPTION_STYLE,
  CAPTION_STYLE_OPTIONS,
} from './utils/index';

export type { VTTCue, CaptionStyleOptions } from './utils/captions';

// i18n
export { getTranslations, en, es } from './i18n/index';
export type { Translations, SupportedLanguage } from './i18n/index';

// Types
export type {
  MediaSource,
  MediaEngineConfig,
  TrackConfig,
  MediaEngineEvents,
  MediaState,
  MediaEventHandler,
} from './types';
