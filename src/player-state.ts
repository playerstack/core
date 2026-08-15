/**
 * Initial player state contract shared across all PlayerStack wrappers.
 */
export const playerStateInitial = {
  kernelError: null as any,
  seeking: false,
  seek: 0,
  played: 0,
  loaded: 0,
  duration: 0,
  isFullScreen: false,
  isEnded: false,
  isPIP: false,
  isLoading: true,
  isBuffering: false,
  volume: 0.8,
  playbackRate: 1,
  playbackQuality: null as number | null,
  videoUrl: null as string | null,
  hasAudio: true,
  loop: false,
  playing: false,
  isMuted: false,
  activeCaption: null as string | null,
};

export type PlayerState = typeof playerStateInitial;

/**
 * Computes the next player state on a seek transition.
 *
 * While seeking, the "ended" overlay is cleared so the user sees the frame
 * they are scrubbing to. When the seek is released, playback always resumes
 * from the new position, regardless of whether the player was paused or ended.
 */
export const reduceSeekState = (prev: PlayerState, seeking: boolean): PlayerState => ({
  ...prev,
  seeking,
  isEnded: false,
  playing: seeking ? prev.playing : true,
});
