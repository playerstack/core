import { EventEmitter } from './event-emitter';
import { getSDK } from './utils/sdk';
import { isMediaStream, hasAudio, supportsWebKitPresentationMode } from './utils/media';
import { HLS_EXTENSIONS, DASH_EXTENSIONS, FLV_EXTENSIONS } from './patterns';
import {
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
import type { MediaEngineConfig, MediaEngineEvents, MediaState } from './types';

/**
 * Framework-agnostic media engine.
 *
 * Manages a native HTMLMediaElement, loading external SDKs (HLS.js, DASH.js, FLV.js)
 * as needed, and exposes a uniform playback API with typed events.
 *
 * Usage:
 * ```ts
 * const video = document.querySelector('video');
 * const engine = new MediaEngine(video, { hlsVersion: '1.5.7' });
 * engine.on('ready', () => console.log('ready'));
 * engine.load('https://example.com/stream.m3u8');
 * ```
 */
export class MediaEngine extends EventEmitter<MediaEngineEvents & Record<string, (...args: any[]) => void>> {
  private el: HTMLMediaElement;
  private config: Required<Pick<MediaEngineConfig, 'hlsVersion' | 'dashVersion' | 'flvVersion'>> & MediaEngineConfig;
  private hls: any = null;
  private dash: any = null;
  private flv: any = null;
  private loadSequence = 0;
  private listenersAttached = false;
  private _destroyed = false;

  constructor(element: HTMLMediaElement, config: MediaEngineConfig = {}) {
    super();
    this.el = element;
    this.config = {
      hlsVersion: DEFAULT_HLS_VERSION,
      dashVersion: DEFAULT_DASH_VERSION,
      flvVersion: DEFAULT_FLV_VERSION,
      ...config,
    };
    this.attachListeners();
  }

  // ─── Public API ───────────────────────────────────────────────────────

  /**
   * Load a media source URL. Automatically selects the correct SDK.
   */
  load(url: string | MediaStream): void {
    if (this._destroyed) return;

    this.destroySDKs();
    this.loadSequence++;
    const currentSequence = this.loadSequence;

    const urlStr = typeof url === 'string' ? url : '';

    if (this.shouldUseHLS(urlStr)) {
      this.loadHLS(urlStr, currentSequence);
    } else if (this.shouldUseDASH(urlStr)) {
      this.loadDASH(urlStr, currentSequence);
    } else if (this.shouldUseFLV(urlStr)) {
      this.loadFLV(urlStr, currentSequence);
    } else if (isMediaStream(url)) {
      try {
        this.el.srcObject = url;
      } catch {
        this.el.src = URL.createObjectURL(url as any);
      }
    } else {
      this.el.src = urlStr;
      if (IS_IOS || this.config.forceDisableHls) {
        this.el.load();
      }
    }
  }

  play(): Promise<void> | void {
    const promise = this.el.play();
    if (promise) {
      return promise.catch((err) => this.emit('error', err));
    }
  }

  pause(): void {
    this.el.pause();
  }

  stop(): void {
    this.el.removeAttribute('src');
    this.el.srcObject = null;
    this.destroySDKs();
  }

  seekTo(seconds: number, keepPlaying = true): void {
    this.el.currentTime = seconds;
    if (!keepPlaying) {
      this.pause();
    }
  }

  setVolume(fraction: number): void {
    this.el.volume = Math.max(0, Math.min(1, fraction));
  }

  getVolume(): number {
    return this.el.volume;
  }

  mute(): void {
    this.el.muted = true;
  }

  unmute(): void {
    this.el.muted = false;
  }

  isMuted(): boolean {
    return this.el.muted;
  }

  setPlaybackRate(rate: number): void {
    try {
      this.el.playbackRate = rate;
    } catch (error) {
      this.emit('error', error);
    }
  }

  getPlaybackRate(): number {
    return this.el.playbackRate;
  }

  setLoop(loop: boolean): void {
    this.el.loop = loop;
  }

  getDuration(): number {
    const { duration, seekable } = this.el;
    if (duration === Infinity && seekable.length > 0) {
      return seekable.end(seekable.length - 1);
    }
    return duration || 0;
  }

  getCurrentTime(): number {
    return this.el.currentTime;
  }

  getSecondsLoaded(): number {
    const { buffered } = this.el;
    if (buffered.length === 0) return 0;
    const end = buffered.end(buffered.length - 1);
    const duration = this.getDuration();
    if (duration && end > duration) return duration;
    return end;
  }

  enablePiP(): void {
    const video = this.el as HTMLVideoElement;
    if (video.requestPictureInPicture && document.pictureInPictureElement !== video) {
      const promise = video.requestPictureInPicture();
      if (promise?.catch) {
        promise.catch((err) => this.emit('error', err));
      }
    } else if (
      supportsWebKitPresentationMode(video) &&
      (video as any).webkitPresentationMode !== 'picture-in-picture'
    ) {
      (video as any).webkitSetPresentationMode('picture-in-picture');
    }
  }

  disablePiP(): void {
    const video = this.el as HTMLVideoElement;
    if (document.exitPictureInPicture && document.pictureInPictureElement === video) {
      document.exitPictureInPicture();
    } else if (supportsWebKitPresentationMode(video) && (video as any).webkitPresentationMode !== 'inline') {
      (video as any).webkitSetPresentationMode('inline');
    }
  }

  /**
   * Get a snapshot of the current media state.
   */
  getState(): MediaState {
    return {
      playing: !this.el.paused && !this.el.ended,
      paused: this.el.paused,
      ended: this.el.ended,
      buffering: this.el.readyState < 3,
      duration: this.getDuration(),
      currentTime: this.getCurrentTime(),
      volume: this.getVolume(),
      muted: this.isMuted(),
      playbackRate: this.getPlaybackRate(),
      loaded: this.getSecondsLoaded(),
      loop: this.el.loop,
      pip: document.pictureInPictureElement === this.el,
    };
  }

  /**
   * Get the underlying media element.
   */
  getElement(): HTMLMediaElement {
    return this.el;
  }

  /**
   * Get the HLS.js instance (if active).
   */
  getHlsInstance(): unknown {
    return this.hls;
  }

  /**
   * Get the DASH.js instance (if active).
   */
  getDashInstance(): unknown {
    return this.dash;
  }

  /**
   * Destroy the engine, removing all listeners and SDK instances.
   */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.stop();
    this.detachListeners();
    this.removeAllListeners();
  }

  // ─── Private ──────────────────────────────────────────────────────────

  private shouldUseHLS(url: string): boolean {
    if ((IS_SAFARI && this.config.forceSafariHLS) || this.config.forceHLS) {
      return true;
    }
    if (IS_IOS || this.config.forceDisableHls) {
      return false;
    }
    return HLS_EXTENSIONS.test(url);
  }

  private shouldUseDASH(url: string): boolean {
    return DASH_EXTENSIONS.test(url) || !!this.config.forceDASH;
  }

  private shouldUseFLV(url: string): boolean {
    return FLV_EXTENSIONS.test(url) || !!this.config.forceFLV;
  }

  private loadHLS(url: string, sequence: number): void {
    getSDK(HLS_SDK_URL.replace('VERSION', this.config.hlsVersion), HLS_GLOBAL)
      .then((Hls: any) => {
        if (sequence !== this.loadSequence || this._destroyed) return;

        // When streaming live content, apply buffer management defaults to prevent
        // SourceBuffer overflow. These can be overridden via hlsOptions.
        const liveDefaults = this.config.live
          ? { maxBufferLength: 30, maxMaxBufferLength: 60, backBufferLength: 30 }
          : {};

        this.hls = new Hls({ ...liveDefaults, ...(this.config.hlsOptions || {}) });
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.emit('ready');
        });
        this.hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          this.emit('error', event, data, this.hls, Hls);
        });
        this.hls.loadSource(url);
        this.hls.attachMedia(this.el);
        this.emit('loaded');
      })
      .catch((err) => this.emit('error', err));
  }

  private loadDASH(url: string, sequence: number): void {
    getSDK(DASH_SDK_URL.replace('VERSION', this.config.dashVersion), DASH_GLOBAL)
      .then((dashjs: any) => {
        if (sequence !== this.loadSequence || this._destroyed) return;
        this.dash = dashjs.MediaPlayer().create();
        this.dash.initialize(this.el, url, false);
        this.dash.on('error', (e: any) => {
          this.emit('error', e, null, this.dash, dashjs);
        });
        if (parseInt(this.config.dashVersion) < 3) {
          this.dash.getDebug().setLogToBrowserConsole(false);
        } else {
          this.dash.updateSettings({ debug: { logLevel: dashjs.LogLevel.LOG_LEVEL_NONE } });
        }
        this.emit('loaded');
      })
      .catch((err) => this.emit('error', err));
  }

  private loadFLV(url: string, sequence: number): void {
    getSDK(FLV_SDK_URL.replace('VERSION', this.config.flvVersion), FLV_GLOBAL)
      .then((flvjs: any) => {
        if (sequence !== this.loadSequence || this._destroyed) return;
        this.flv = flvjs.createPlayer({ type: 'flv', url });
        this.flv.attachMediaElement(this.el);
        this.flv.on(flvjs.Events.ERROR, (e: any, data: any) => {
          this.emit('error', e, data, this.flv, flvjs);
        });
        this.flv.load();
        this.emit('loaded');
      })
      .catch((err) => this.emit('error', err));
  }

  private destroySDKs(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.dash) {
      this.dash.reset();
      this.dash = null;
    }
    if (this.flv) {
      this.flv.unload();
      this.flv.detachMediaElement();
      this.flv.destroy();
      this.flv = null;
    }
  }

  // ─── DOM Event Listeners ──────────────────────────────────────────────

  private onPlay = () => {
    this.emit('play', { hasAudio: hasAudio(this.el as HTMLVideoElement) });
  };
  private onPause = () => this.emit('pause');
  private onEnded = () => this.emit('ended');
  private onBuffer = () => this.emit('buffer');
  private onBufferEnd = () => this.emit('bufferEnd');
  private onSeeked = () => this.emit('seek', this.el.currentTime);
  private onError = (e: Event) => this.emit('error', e);
  private onRateChange = () => this.emit('playbackRateChange', this.el.playbackRate);
  private onCanPlay = () => this.emit('ready');
  private onDurationChange = () => this.emit('durationChange', this.getDuration());
  private onTimeUpdate = () => this.emit('timeUpdate', this.el.currentTime);
  private onVolumeChange = () => this.emit('volumeChange', this.el.volume, this.el.muted);
  private onProgress = () => this.emit('progress', this.getSecondsLoaded());
  private onEnterPiP = () => this.emit('enablePiP');
  private onLeavePiP = () => this.emit('disablePiP');
  private onPresentationModeChange = () => {
    const video = this.el as HTMLVideoElement;
    if (supportsWebKitPresentationMode(video)) {
      const mode = (video as any).webkitPresentationMode;
      if (mode === 'picture-in-picture') this.emit('enablePiP');
      else if (mode === 'inline') this.emit('disablePiP');
    }
  };

  private attachListeners(): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    const el = this.el;
    el.addEventListener('play', this.onPlay);
    el.addEventListener('pause', this.onPause);
    el.addEventListener('ended', this.onEnded);
    el.addEventListener('waiting', this.onBuffer);
    el.addEventListener('playing', this.onBufferEnd);
    el.addEventListener('seeked', this.onSeeked);
    el.addEventListener('error', this.onError);
    el.addEventListener('ratechange', this.onRateChange);
    el.addEventListener('canplay', this.onCanPlay);
    el.addEventListener('durationchange', this.onDurationChange);
    el.addEventListener('timeupdate', this.onTimeUpdate);
    el.addEventListener('volumechange', this.onVolumeChange);
    el.addEventListener('progress', this.onProgress);
    el.addEventListener('enterpictureinpicture', this.onEnterPiP);
    el.addEventListener('leavepictureinpicture', this.onLeavePiP);
    el.addEventListener('webkitpresentationmodechanged', this.onPresentationModeChange);
  }

  private detachListeners(): void {
    if (!this.listenersAttached) return;
    this.listenersAttached = false;

    const el = this.el;
    el.removeEventListener('play', this.onPlay);
    el.removeEventListener('pause', this.onPause);
    el.removeEventListener('ended', this.onEnded);
    el.removeEventListener('waiting', this.onBuffer);
    el.removeEventListener('playing', this.onBufferEnd);
    el.removeEventListener('seeked', this.onSeeked);
    el.removeEventListener('error', this.onError);
    el.removeEventListener('ratechange', this.onRateChange);
    el.removeEventListener('canplay', this.onCanPlay);
    el.removeEventListener('durationchange', this.onDurationChange);
    el.removeEventListener('timeupdate', this.onTimeUpdate);
    el.removeEventListener('volumechange', this.onVolumeChange);
    el.removeEventListener('progress', this.onProgress);
    el.removeEventListener('enterpictureinpicture', this.onEnterPiP);
    el.removeEventListener('leavepictureinpicture', this.onLeavePiP);
    el.removeEventListener('webkitpresentationmodechanged', this.onPresentationModeChange);
  }
}
