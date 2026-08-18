// Core
export { MediaEngine } from '@media-engine';
export { EventEmitter } from '@event-emitter';

// Live DVR
export { computeLiveDVRState, sliderPositionToTime, formatLiveOffset } from '@live-dvr';
export type { LiveDVRState, LiveDVRConfig } from '@typings/live-dvr.types';

// Patterns
export {
  canPlay,
  isAudioUrl,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  HLS_EXTENSIONS,
  DASH_EXTENSIONS,
  FLV_EXTENSIONS,
} from '@patterns';

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
  DEFAULT_PROGRESS_INTERVAL,
  defaultMediaConfig,
} from '@constants';

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
  isTestEnv,
  enableStubOn,
  parseVTTCaptions,
  getActiveCues,
  hexToRgba,
  getEdgeStyleCSS,
  DEFAULT_CAPTION_STYLE,
  CAPTION_STYLE_OPTIONS,
  parseSpriteVTT,
  timeCodeToSeconds,
} from '@utils/index';

export type { VTTCue, CaptionStyleOptions } from '@typings/utils/captions.types';
export type { VttSpriteCue, SpriteFrame } from '@utils/vtt-sprite';

// Sprite Frame Computation
export { computeSpriteFrame } from '@sprite';
export type { SpriteCue, ComputedSpriteFrame } from '@typings/sprite.types';

// Player State
export { playerStateInitial, audioPlayerStateInitial, reduceSeekState } from '@player-state';
export type { PlayerState, AudioPlayerState } from '@player-state';

// Keyboard
export { eventsKeyCodes, keyMappings } from '@keyboard';

// Chapters
export { computeChapterSegments, getChapterAtTime } from '@chapters';
export type { ChapterInput, ChapterSegment } from '@typings/chapters.types';

// Heatmap
export { generateHeatmapPath } from '@heatmap';
export type { HeatmapDataPoint } from '@typings/heatmap.types';

// UI Sizing
export { buildIconProps, sliderWidth, buildSettingsLabel, buildSettingsOptions, settingsInitialState } from '@ui';
export type { SettingsOption } from '@typings/ui.types';

// Reducer
export { createTypedReducer } from '@reducer';

// Slider Math
export {
  getEventXCoordinate,
  getClampedPosition,
  getTimeFromSliderPosition,
  getTrackTranslateX,
  getMouseTranslateX,
  getVolumePercentage,
} from '@slider';

// Quality Selection
export { VIDEO_QUALITY_THRESHOLDS, measureNetworkSpeed, getRecommendedVideoQuality } from '@quality';

// i18n
export { getTranslations, en, es } from '@i18n/index';
export type { Translations, SupportedLanguage } from '@i18n/index';

// Adapters
export type { AdsPlatform, AdsConfig, VolumeAdapter, DVRAdapter, PlayerAdapter } from '@typings/adapters.types';

// Types
export type {
  MediaSource,
  MediaEngineConfig,
  TrackConfig,
  MediaEngineEvents,
  MediaState,
  MediaEventHandler,
} from '@typings/media.types';
