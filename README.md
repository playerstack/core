# @playerstack/core

[![npm version](https://img.shields.io/npm/v/@playerstack/core.svg)](https://www.npmjs.com/package/@playerstack/core)
[![Test Coverage](https://img.shields.io/codecov/c/github/playerstack/core.svg)](https://codecov.io/gh/playerstack/core)

Framework-agnostic media engine for video and audio playback. Supports HLS, DASH, FLV and native HTML5 media formats.

This package provides the core playback logic used by framework-specific wrappers like [`@playerstack/reactjs`](https://github.com/playerstack/reactjs).

## Installation

```bash
npm install @playerstack/core
```

## Quick Start

```ts
import { MediaEngine } from '@playerstack/core';

const video = document.querySelector('video')!;
const engine = new MediaEngine(video, {
  hlsVersion: '1.5.7',
});

engine.on('ready', () => {
  console.log('Media is ready to play');
  engine.play();
});

engine.on('timeUpdate', (currentTime) => {
  console.log(`Current time: ${currentTime}`);
});

engine.on('error', (err) => {
  console.error('Playback error:', err);
});

engine.load('https://example.com/video.m3u8');
```

## Features

- **Framework-agnostic** — works with React, Vue, Svelte, Solid, Angular, vanilla JS, or any framework
- **Automatic SDK loading** — HLS.js, DASH.js, and FLV.js loaded on-demand from CDN
- **Typed events** — fully typed EventEmitter API
- **Unified playback API** — play, pause, seek, volume, PiP, playback rate
- **State snapshots** — get full media state at any time
- **Zero UI opinions** — bring your own player skin
- **Tree-shakeable** — only import what you need

## API

### `MediaEngine`

```ts
new MediaEngine(element: HTMLMediaElement, config?: MediaEngineConfig)
```

#### Methods

| Method | Description |
|--------|-------------|
| `load(url)` | Load a media source (auto-detects format) |
| `play()` | Start playback |
| `pause()` | Pause playback |
| `stop()` | Stop and unload media |
| `seekTo(seconds, keepPlaying?)` | Seek to a time position |
| `setVolume(fraction)` | Set volume (0–1) |
| `mute()` / `unmute()` | Mute/unmute |
| `setPlaybackRate(rate)` | Set playback speed |
| `setLoop(loop)` | Enable/disable looping |
| `enablePiP()` / `disablePiP()` | Picture-in-Picture |
| `getState()` | Get current media state snapshot |
| `getElement()` | Get the underlying HTMLMediaElement |
| `getHlsInstance()` | Get HLS.js instance (if active) |
| `getDashInstance()` | Get DASH.js instance (if active) |
| `destroy()` | Clean up all listeners and SDK instances |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | — | Media can begin playback |
| `play` | `{ hasAudio }` | Playback started |
| `pause` | — | Playback paused |
| `ended` | — | Playback ended |
| `buffer` | — | Buffering started |
| `bufferEnd` | — | Buffering ended |
| `seek` | `currentTime` | Seek completed |
| `error` | `error, data?, instance?, sdk?` | Error occurred |
| `playbackRateChange` | `rate` | Playback rate changed |
| `enablePiP` | — | Entered PiP mode |
| `disablePiP` | — | Exited PiP mode |
| `loaded` | — | SDK loaded and attached |
| `durationChange` | `duration` | Duration changed |
| `timeUpdate` | `currentTime` | Current time updated |
| `volumeChange` | `volume, muted` | Volume changed |
| `progress` | `loaded` | Buffer progress |

### Utilities

```ts
import { formatTime, canPlay, isDesktop, isMobile } from '@playerstack/core/utils';
```

### i18n

```ts
import { getTranslations } from '@playerstack/core/i18n';

const t = getTranslations('es');
console.log(t.play); // "Reproducir"
```

## Supported Formats

| Format | Extension | SDK |
|--------|-----------|-----|
| Native video | `.mp4`, `.webm`, `.ogg`, `.mov`, `.m4v` | HTML5 `<video>` |
| HLS | `.m3u8` | hls.js (loaded from CDN) |
| DASH | `.mpd` | dash.js (loaded from CDN) |
| FLV | `.flv` | flv.js (loaded from CDN) |
| MediaStream | — | Native |
| Blob URL | — | Native |

## Configuration

```ts
interface MediaEngineConfig {
  hlsVersion?: string;      // Default: '1.5.7'
  hlsOptions?: object;      // Passed to HLS.js constructor
  dashVersion?: string;     // Default: '4.7.4'
  flvVersion?: string;      // Default: '1.6.2'
  forceHLS?: boolean;       // Force HLS.js regardless of extension
  forceSafariHLS?: boolean; // Force HLS.js on Safari
  forceDisableHls?: boolean;// Disable HLS.js (use native)
  forceDASH?: boolean;      // Force DASH.js
  forceFLV?: boolean;       // Force FLV.js
}
```

## Usage with Frameworks

This package is consumed by framework-specific wrappers:

- [`@playerstack/reactjs`](https://github.com/playerstack/reactjs) — React wrapper

More wrappers coming: Vue, Svelte, Solid, React Native, etc.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

[MIT](./LICENSE.md) © Oscar Garcés
